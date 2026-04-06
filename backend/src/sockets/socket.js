const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { triggerSOS } = require('../services/dynamicProximitySearch');
const h3 = require('h3-js');
const admin = require('firebase-admin');
const { alertHelpersViaFCM, alertEmergencyContacts } = require('../services/fcmService');

const activeEmergencyRooms = new Map();

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FCM_SERVER_KEY);
} catch (error) {
  console.error("🔥 CRITICAL: Failed to parse Firebase Secret.", error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = function initializeSocket(server, redisClient, pubClient, subClient) {
  const io = new Server(server, { cors: { origin: '*' } });
  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log(`[CONNECTED] ${socket.id}`);

    // --- PHASE 1 & 2: INGESTING REAL LOCATIONS FROM DEVICES ---
    // ── LOCATION UPDATES ──────────────────────────────────────
    socket.on('my_location_updated', async (payload) => {
      const { userId, lat, lng } = payload;
      const H3_RESOLUTION = 9;

      try {
        const newH3Cell = h3.latLngToCell(lat, lng, H3_RESOLUTION);
        const oldData = await redisClient.hgetall(`last-location:${userId}`);
        const pipeline = redisClient.multi();

        if (oldData && oldData.region && oldData.region !== newH3Cell) {
          pipeline.srem(`active-users:${oldData.region}`, userId);
        }

        pipeline.sadd(`active-users:${newH3Cell}`, userId);
        pipeline.hset(`last-location:${userId}`, {
          lat: lat.toString(),
          long: lng.toString(),
          region: newH3Cell
        });

        await pipeline.exec();
      } catch (err) {
        console.error('[LOCATION ERROR]', err);
      }
    });

    // ─── PHASE 4: INGESTING OFFLINE LOCATION QUEUES ──────────────
    // Handles bulk flush from the React Native hybrid tracking (500m + heartbeat)
    socket.on('bulk_location_update', async (payload) => {
      const { userId, locations } = payload;
      console.log(`[SYNC] Received ${locations.length} offline pings for ${userId}`);

      // Take the most recent location from the array to update their current H3 cell
      const latest = locations[locations.length - 1];
      const newH3Cell = h3.latLngToCell(latest.lat, latest.lng, 9);

      const pipeline = redisClient.multi();
      pipeline.sadd(`active-users:${newH3Cell}`, userId);
      pipeline.hset(`last-location:${userId}`, {
        lat: latest.lat.toString(),
        long: latest.lng.toString(),
        region: newH3Cell,
        lastUpdated: Date.now()
      });
      await pipeline.exec();
    });

    socket.on('sos_trigger', async (payload) => {
      const { userId, location } = payload;
      const roomId = `incident_${userId}`;
      const redisNotifiedKey = `${roomId}:notified`;
      console.log(`[SOS TRIGGER] userId=${userId} lat=${location.lat} lng=${location.lng}`);

      try {
        socket.join(roomId);
        activeEmergencyRooms.set(roomId, {
          victimSocketId: socket.id,
          currentSosTimeoutId: null,
          rejectionCount: 0,
          originalVictimLocation: location,
        });

        console.log(`[ROOM CREATED] ${roomId}`);
        alertEmergencyContacts(userId, location);
        startAutomatedDispatchLoop(roomId, redisNotifiedKey, location);
      } catch (err) {
        console.error('[SOS TRIGGER ERROR]', err);
        socket.emit('error_msg', { message: 'Server error initiating SOS.' });
      }
    });

    // ── VICTIM CANCELS SOS ─────────────────────────────────────────────
    socket.on('sos_cancelled', async ({ roomId }) => {
      const emergencyState = activeEmergencyRooms.get(roomId);
      if (!emergencyState) return;
      if (emergencyState.currentSosTimeoutId) clearTimeout(emergencyState.currentSosTimeoutId);

      try {
        await redisClient.del(`${roomId}:notified`);
      } catch (err) {
        console.error('[REDIS CLEANUP ERROR]', err);
      }

      socket.to(roomId).emit('cancel_alert', { roomId, message: 'SOS was cancelled.' });
      activeEmergencyRooms.delete(roomId);
    });

    // ── HELPER ACCEPTS ────────────────────────────────────────────────
    socket.on('helper_accept', async ({ helperId, helperName, roomId }) => {
      const emergencyState = activeEmergencyRooms.get(roomId);
      if (!emergencyState) return;
      socket.join(roomId);
      if (emergencyState.currentSosTimeoutId) clearTimeout(emergencyState.currentSosTimeoutId);

      io.to(emergencyState.victimSocketId).emit('helper_assigned', {
        helperId, helperName: helperName || helperId, message: 'Help is on the way!'
      });
      socket.to(roomId).emit('cancel_alert', { roomId, message: 'Another helper accepted.' });
    });

    socket.on('victim_location_update', ({ roomId, location }) => {
      socket.to(roomId).emit('update_victim_pin', location);
    });

    socket.on('helper_location_update', ({ roomId, helperId, location }) => {
      const emergencyState = activeEmergencyRooms.get(roomId);
      if (emergencyState?.victimSocketId) {
        io.to(emergencyState.victimSocketId).emit('update_helper_pin', { helperId, location });
      }
    });

    // ── HELPER REJECTS / DISCONNECT ───────────────────────────────────
    socket.on('disconnect', async () => {
      for (const [roomId, emergencyState] of activeEmergencyRooms.entries()) {
        if (emergencyState.victimSocketId !== socket.id) continue;
        if (emergencyState.currentSosTimeoutId) clearTimeout(emergencyState.currentSosTimeoutId);

        try {
          await redisClient.del(`${roomId}:notified`);
        } catch (err) {
          console.error('[REDIS CLEANUP ERROR]', err);
        }

        socket.to(roomId).emit('cancel_alert', { roomId, message: 'Victim lost connection.' });
        activeEmergencyRooms.delete(roomId);
        break;
      }
    });
  });

  // ─── PHASE 3: WAKE-ON-PUSH (The "App Killed" Failsafe) ──────────────
  // Call this from your backend when a user's lastUpdated is too old
  async function forceWakeDevice(fcmToken) {
    const message = {
      // Notice there is NO "notification" object here.
      // This makes it a "Silent Data Message". It won't ring the user's phone,
      // it just forcefully wakes the React Native JavaScript thread.
      data: {
        command: 'WAKE_AND_PING_LOCATION',
        urgency: 'HIGH'
      },
      token: fcmToken,
      android: {
        priority: 'high' // Bypasses Android Doze mode
      },
      apns: {
        payload: {
          aps: {
            'content-available': 1 // Wakes up iOS devices
          }
        }
      }
    };
    try {
      const response = await admin.messaging().send(message);
      console.log(`[WAKE-ON-PUSH] Successfully fired silent push to wake device:`, response);
    } catch (error) {
      console.error(`[WAKE-ON-PUSH ERROR] Device dead or token invalid:`, error);
    }
  }

  async function startAutomatedDispatchLoop(roomId, redisNotifiedKey, victimLocation) {
    const emergencyState = activeEmergencyRooms.get(roomId);
    if (!emergencyState) return;

    try {
      const alreadyNotified = await redisClient.smembers(redisNotifiedKey);
      const result = await triggerSOS(victimLocation.lat, victimLocation.lng, alreadyNotified, redisClient);

      if (!Array.isArray(result) || result.length === 0) {
        io.to(emergencyState.victimSocketId).emit('escalate_to_911', { roomId });
        return;
      }

      const helpersToNotify = result.slice(0, 5);
      io.to(emergencyState.victimSocketId).emit(`sos_helpers_${roomId}`, {
        helpers: helpersToNotify.map(h => ({
          userId: h.userId, name: h.name || `Volunteer`, lat: h.lat, long: h.long, distance: h.distance,
        })),
      });
      alertHelpersViaFCM(helpersToNotify, victimLocation);

      // Phase 3 Prep: We notify connected sockets. If a socket isn't connected, we would trigger an FCM Data push here.
      helpersToNotify.forEach(helper => {
        io.emit(`sos_alert_${helper.userId}`, { roomId, victimLocation, message: 'Emergency nearby!' });
      });

      const helperIds = helpersToNotify.map(h => h.userId);
      await redisClient.sadd(redisNotifiedKey, helperIds);

      emergencyState.currentSosTimeoutId = setTimeout(() => {
        startAutomatedDispatchLoop(roomId, redisNotifiedKey, victimLocation);
      }, 30000);

    } catch (err) {
      console.error('[DISPATCH ERROR]', err);
    }
  }
};