const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { triggerSOS, setRedisClient } = require('../services/dynamicProximitySearch');

// roomId -> { victimSocketId, currentSosTimeoutId, rejectionCount, originalVictimLocation }
const activeEmergencyRooms = new Map();

module.exports = function initializeSocket(server, redisClient, pubClient, subClient) {
  setRedisClient(redisClient);

  const io = new Server(server, { cors: { origin: '*' } });
  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log(`[CONNECTED] ${socket.id}`);

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
        startAutomatedDispatchLoop(roomId, redisNotifiedKey, location);

      } catch (err) {
        console.error('[SOS TRIGGER ERROR]', err);
        socket.emit('error_msg', { message: 'Server error initiating SOS.' });
      }
    });

    // ── (II) VICTIM CANCELS SOS ─────────────────────────────────────────────
    socket.on('sos_cancelled', async ({ roomId }) => {
      const emergencyState = activeEmergencyRooms.get(roomId);
      if (!emergencyState) return;

      if (emergencyState.currentSosTimeoutId) {
        clearTimeout(emergencyState.currentSosTimeoutId);
      }

      try {
        await redisClient.del(`${roomId}:notified`);
      } catch (err) {
        console.error('[REDIS CLEANUP ERROR]', err);
      }

      socket.to(roomId).emit('cancel_alert', { roomId, message: 'SOS was cancelled by the victim.' });
      activeEmergencyRooms.delete(roomId);
      console.log(`[SOS CANCELLED] ${roomId}`);
    });

    // ── (III) HELPER ACCEPTS ────────────────────────────────────────────────
    socket.on('helper_accept', async ({ helperId, helperName, roomId }) => {
      const emergencyState = activeEmergencyRooms.get(roomId);
      if (!emergencyState) {
        return socket.emit('error_msg', { message: 'Emergency room not found.' });
      }

      socket.join(roomId);

      if (emergencyState.currentSosTimeoutId) {
        clearTimeout(emergencyState.currentSosTimeoutId);
      }

      try {
        await redisClient.del(`${roomId}:notified`);
      } catch (err) {
        console.error('[REDIS CLEANUP ERROR]', err);
      }

      // Tell the victim privately
      io.to(emergencyState.victimSocketId).emit('helper_assigned', {
        helperId,
        helperName: helperName || helperId,
        message: 'Someone is on the way to help you!',
      });

      // Tell other notified helpers to dismiss the alert
      socket.to(roomId).emit('cancel_alert', {
        roomId,
        message: 'Another helper has already accepted this SOS.',
      });

      console.log(`[HELPER ACCEPTED] ${helperId} accepted ${roomId}`);
    });

    // ── (IV) HELPER REJECTS ─────────────────────────────────────────────────
    socket.on('helper_reject', async ({ helperId, roomId }) => {
      const emergencyState = activeEmergencyRooms.get(roomId);
      if (!emergencyState) return;

      emergencyState.rejectionCount = (emergencyState.rejectionCount || 0) + 1;
      console.log(`[REJECTED] ${helperId} — room ${roomId} at ${emergencyState.rejectionCount}/5`);

      if (emergencyState.rejectionCount >= 5) {
        console.log(`[FAST-FORWARD] 5 rejections — triggering next batch immediately`);

        if (emergencyState.currentSosTimeoutId) {
          clearTimeout(emergencyState.currentSosTimeoutId);
        }
        emergencyState.rejectionCount = 0;

        const redisNotifiedKey = `${roomId}:notified`;
        startAutomatedDispatchLoop(roomId, redisNotifiedKey, emergencyState.originalVictimLocation);
      }
    });

    // ── (V) LOCATION UPDATES ────────────────────────────────────────────────
    socket.on('victim_location_update', ({ roomId, location }) => {
      socket.to(roomId).emit('update_victim_pin', location);
    });

    socket.on('helper_location_update', ({ roomId, helperId, location }) => {
      const emergencyState = activeEmergencyRooms.get(roomId);
      if (emergencyState?.victimSocketId) {
        io.to(emergencyState.victimSocketId).emit('update_helper_pin', { helperId, location });
      }
    });

    // ── (VI) DISCONNECT ─────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`[DISCONNECTED] ${socket.id}`);

      for (const [roomId, emergencyState] of activeEmergencyRooms.entries()) {
        if (emergencyState.victimSocketId !== socket.id) continue;

        console.log(`[CLEANUP] Victim disconnected — tearing down ${roomId}`);

        if (emergencyState.currentSosTimeoutId) {
          clearTimeout(emergencyState.currentSosTimeoutId);
        }

        try {
          await redisClient.del(`${roomId}:notified`);
        } catch (err) {
          console.error('[REDIS CLEANUP ERROR]', err);
        }

        socket.to(roomId).emit('cancel_alert', {
          roomId,
          message: 'SOS cancelled — victim lost connection.',
        });

        activeEmergencyRooms.delete(roomId);
        break;
      }
    });
  });

  // ── DISPATCH LOOP ──────────────────────────────────────────────────────────
  // Called on sos_trigger and recursively every 30s until a helper accepts.
  async function startAutomatedDispatchLoop(roomId, redisKey, victimLocation) {
    const emergencyState = activeEmergencyRooms.get(roomId);
    if (!emergencyState) return;

    try {
      // 1. Read who was already notified so we don't ping them again
      const alreadyNotified = await redisClient.smembers(redisKey);
      console.log(`[DISPATCH] Room ${roomId} — already notified: ${alreadyNotified.length}`);

      // 2. Find nearby helpers via H3 proximity search
      const result = await triggerSOS(victimLocation.lat, victimLocation.lng, alreadyNotified);

      // 3. Handle empty pool — escalate to 911
      if (!Array.isArray(result) || result.length === 0) {
        console.log(`[EMPTY POOL] No helpers found for ${roomId} — escalating to 911`);
        io.to(emergencyState.victimSocketId).emit('escalate_to_911', {
          roomId,
          message: 'No helpers found nearby. Please call 911 immediately.',
        });
        return;
      }

      const helpersToNotify = result.slice(0, 5);

      // 4. Send helper data back to the VICTIM so their map updates
      //    This is the key event the frontend listens for
      io.to(emergencyState.victimSocketId).emit(`sos_helpers_${roomId}`, {
        helpers: helpersToNotify.map(h => ({
          userId: h.userId,
          name: h.name || `Volunteer ${h.userId.slice(-3)}`,
          lat: h.lat,
          long: h.long,
          distance: h.distance,
        })),
      });

      console.log(`[DISPATCH] Sent ${helpersToNotify.length} helpers to victim for ${roomId}`);

      // 5. Notify each helper that there's a nearby SOS
      helpersToNotify.forEach(helper => {
        io.emit(`sos_alert_${helper.userId}`, {
          roomId,
          victimLocation,
          message: 'Emergency nearby! Can you assist?',
        });
      });

      // 6. Write notified helpers to Redis so next batch skips them
      const helperIds = helpersToNotify.map(h => h.userId);
      await redisClient.sadd(redisKey, helperIds);
      console.log(`[REDIS WRITE] Saved ${helperIds.length} notified IDs for ${roomId}`);

      // 7. Schedule next search in 30s
      emergencyState.currentSosTimeoutId = setTimeout(() => {
        console.log(`[TIMER] 30s elapsed for ${roomId} — running next batch`);
        startAutomatedDispatchLoop(roomId, redisKey, victimLocation);
      }, 30000);

    } catch (err) {
      console.error('[DISPATCH ERROR]', err);
    }
  }
};