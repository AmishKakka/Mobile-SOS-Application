const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const h3 = require('h3-js');
const admin = require('firebase-admin');
const { triggerSOS } = require('../services/dynamicProximitySearch');
const { alertHelpersViaFCM, alertEmergencyContacts } = require('../services/fcmService');
const User = require('../models/User');

const H3_RESOLUTION = Number(process.env.H3_RESOLUTION || 9);
const DISPATCH_TIMEOUT_MS = Number(process.env.SOS_DISPATCH_TIMEOUT_MS || 30000);
const NOTIFY_BATCH_SIZE = Number(process.env.SOS_NOTIFY_BATCH_SIZE || 5);
const MAX_SEARCH_RING = Number(process.env.SOS_MAX_RINGS || 11);
const SEARCH_RING_STEP = Math.max(1, Number(process.env.SOS_SEARCH_RING_STEP || 1));
const SEARCH_POOL_LIMIT = Math.max(
  NOTIFY_BATCH_SIZE,
  Number(process.env.SOS_SEARCH_POOL_LIMIT || 100),
);

const activeEmergencyRooms = new Map();

function initializeFirebase() {
  if (admin.apps.length > 0) return;
  if (!process.env.FCM_SERVER_KEY) {
    console.warn('[FCM] FCM_SERVER_KEY not found. Push delivery is disabled.');
    return;
  }
  try {
    const serviceAccount = JSON.parse(process.env.FCM_SERVER_KEY);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('[FCM] Firebase admin initialized.');
  } catch (error) {
    console.error('[FCM] Failed to initialize Firebase admin:', error.message);
  }
}

function isValidLocation(location) {
  return location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng));
}

module.exports = function initializeSocket(server, redisClient, pubClient, subClient) {
  initializeFirebase();

  const io = new Server(server, { cors: { origin: '*' } });
  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected ${socket.id}`);

    socket.on('register_user', async (payload = {}) => {
      const userId = String(payload.userId || '').trim();
      if (!userId) {
        socket.emit('error_msg', { message: 'register_user requires a userId.' });
        return;
      }

      const role = ['victim', 'helper', 'contact'].includes(payload.role)
        ? payload.role
        : 'victim';
      const name = typeof payload.name === 'string' ? payload.name.trim() : undefined;

      socket.data.userId = userId;
      socket.data.role = role;
      socket.join(`user:${userId}`);

      try {
        await User.updateOne(
          { _id: userId },
          {
            $set: {
              ...(name ? { name } : {}),
              role,
            },
            $setOnInsert: {
              emergencyContacts: [],
            },
          },
          { upsert: true },
        );
      } catch (error) {
        console.error('[SOCKET] Failed to upsert registered user:', error.message);
      }

      socket.emit('registered', { userId, role });
    });

    socket.on('my_location_updated', async (payload = {}) => {
      const { userId } = payload;
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);

      if (!userId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        socket.emit('error_msg', { message: 'my_location_updated requires userId, lat and lng.' });
        return;
      }

      await upsertLiveLocation(redisClient, userId, { lat, lng });

      try {
        await User.updateOne(
          { _id: userId },
          {
            $set: {
              lastKnownLocation: {
                lat,
                lng,
                updatedAt: new Date(),
              },
            },
          },
          { upsert: true },
        );
      } catch (error) {
        console.error('[SOCKET] Failed to update helper location in Mongo:', error.message);
      }
    });

    socket.on('bulk_location_update', async (payload = {}) => {
      const { userId, locations } = payload;
      if (!userId || !Array.isArray(locations) || locations.length === 0) {
        return;
      }

      const latest = locations[locations.length - 1];
      const lat = Number(latest.lat);
      const lng = Number(latest.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      await upsertLiveLocation(redisClient, userId, { lat, lng });
    });

    socket.on('sos_trigger', async (payload = {}) => {
      const userId = String(payload.userId || '').trim();
      const location = payload.location;

      if (!userId || !isValidLocation(location)) {
        socket.emit('error_msg', { message: 'sos_trigger requires a valid userId and location.' });
        return;
      }

      const roomId = `incident_${userId}`;
      const redisNotifiedKey = `${roomId}:notified`;

      try {
        const victimLocation = {
          lat: Number(location.lat),
          lng: Number(location.lng),
        };

        if (activeEmergencyRooms.has(roomId)) {
          await cleanupRoom(roomId, redisClient, { clearRedisOnly: true });
        }

        socket.join(roomId);
        activeEmergencyRooms.set(roomId, {
          roomId,
          victimUserId: userId,
          victimSocketId: socket.id,
          currentVictimLocation: victimLocation,
          currentSearchRing: -1,
          currentSosTimeoutId: null,
          assignedHelperIds: [],
          currentBatchHelperIds: [],
          redisNotifiedKey,
        });

        await User.updateOne(
          { _id: userId },
          {
            $set: {
              lastKnownLocation: {
                lat: victimLocation.lat,
                lng: victimLocation.lng,
                updatedAt: new Date(),
              },
            },
          },
          { upsert: true },
        );

        await alertEmergencyContacts(userId, victimLocation, roomId);
        await startAutomatedDispatchLoop(io, redisClient, roomId);
      } catch (error) {
        console.error('[SOS] Failed to trigger SOS:', error);
        socket.emit('error_msg', { message: 'Server error while starting SOS.' });
      }
    });

    socket.on('sos_cancelled', async ({ roomId } = {}) => {
      if (!roomId || !activeEmergencyRooms.has(roomId)) {
        return;
      }

      io.to(roomId).emit('cancel_alert', {
        roomId,
        message: 'The victim cancelled the SOS request.',
      });

      await cleanupRoom(roomId, redisClient);
    });

    socket.on('helper_accept', async ({ helperId, helperName, roomId } = {}, ack = () => { }) => {
      if (!roomId || !helperId) {
        ack({ ok: false, message: 'helper_accept requires roomId and helperId.' });
        return;
      }

      const state = activeEmergencyRooms.get(roomId);
      if (!state) {
        socket.emit('error_msg', { message: 'Incident no longer exists.' });
        ack({ ok: false, message: 'Incident no longer exists.' });
        return;
      }

      if (state.assignedHelperIds.includes(helperId)) {
        ack({
          ok: true,
          roomId,
          victimUserId: state.victimUserId,
          victimLocation: state.currentVictimLocation,
          incidentType: 'Emergency',
        });
        return;
      }

      // if (
      //   !state.currentBatchHelperIds.includes(helperId)
      //   || !state.currentSosTimeoutId
      // ) {
      //   ack({
      //     ok: false,
      //     code: 'INCIDENT_CLOSED',
      //     message: 'This SOS is no longer accepting new helper responses.',
      //   });
      //   return;
      // }

      state.assignedHelperIds.push(helperId);

      socket.join(roomId);
      socket.data.activeRoomId = roomId;

      ack({
        ok: true,
        roomId,
        victimUserId: state.victimUserId,
        victimLocation: state.currentVictimLocation,
        incidentType: 'Emergency',
      });

      io.to(`user:${state.victimUserId}`).emit('helper_assigned', {
        roomId,
        helperId,
        helperName: helperName || helperId,
        acceptedHelperIds: state.assignedHelperIds,
        acceptedCount: state.assignedHelperIds.length,
        message:
          state.assignedHelperIds.length > 1
            ? `${state.assignedHelperIds.length} helpers accepted your SOS and are on the way.`
            : 'A helper accepted your SOS and is on the way.',
      });
    });

    socket.on('helper_reject', async ({ helperId, roomId } = {}) => {
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !helperId) {
        return;
      }

      try {
        await redisClient.sadd(state.redisNotifiedKey, String(helperId));
      } catch (error) {
        console.error('[SOS] Failed to mark rejected helper:', error.message);
      }
    });

    socket.on('victim_location_update', async ({ roomId, location } = {}) => {
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !isValidLocation(location)) {
        return;
      }

      const nextLocation = {
        lat: Number(location.lat),
        lng: Number(location.lng),
      };

      state.currentVictimLocation = nextLocation;
      io.to(roomId).emit('update_victim_pin', nextLocation);
    });

    socket.on('helper_location_update', async ({ roomId, helperId, location } = {}) => {
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !helperId || !isValidLocation(location)) {
        return;
      }

      const nextLocation = {
        lat: Number(location.lat),
        lng: Number(location.lng),
      };

      await upsertLiveLocation(redisClient, helperId, nextLocation);
      io.to(`user:${state.victimUserId}`).emit('update_helper_pin', {
        helperId,
        location: nextLocation,
      });
    });

    socket.on('helper_response_cancelled', async ({ roomId, helperId, reason } = {}) => {
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !state.assignedHelperIds.includes(helperId)) {
        return;
      }

      state.assignedHelperIds = state.assignedHelperIds.filter((id) => id !== helperId);
      socket.leave(roomId);

      io.to(`user:${state.victimUserId}`).emit('helper_response_cancelled', {
        roomId,
        helperId,
        acceptedHelperIds: state.assignedHelperIds,
        reason: reason || 'The helper stopped responding.',
      });

      await redisClient.sadd(state.redisNotifiedKey, String(helperId));

      if (state.assignedHelperIds.length === 0 && !state.currentSosTimeoutId) {
        await startAutomatedDispatchLoop(io, redisClient, roomId);
      }
    });

    socket.on('helper_response_completed', async ({ roomId, helperId, outcome, notes } = {}) => {
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !state.assignedHelperIds.includes(helperId)) {
        return;
      }

      if (outcome === 'cannot_handle') {
        state.assignedHelperIds = state.assignedHelperIds.filter((id) => id !== helperId);

        io.to(`user:${state.victimUserId}`).emit('helper_response_cancelled', {
          roomId,
          helperId,
          acceptedHelperIds: state.assignedHelperIds,
          reason: notes || 'A helper could not handle this incident.',
        });

        await redisClient.sadd(state.redisNotifiedKey, String(helperId));

        if (state.assignedHelperIds.length === 0 && !state.currentSosTimeoutId) {
          await startAutomatedDispatchLoop(io, redisClient, roomId);
        }
        return;
      }

      io.to(roomId).emit('incident_resolved', {
        roomId,
        helperId,
        outcome: outcome || 'helped',
        notes: notes || '',
      });

      await cleanupRoom(roomId, redisClient);
    });

    socket.on('disconnect', async () => {
      const userId = socket.data.userId;
      const activeRoomId = socket.data.activeRoomId;

      if (!userId) {
        return;
      }

      for (const [roomId, state] of activeEmergencyRooms.entries()) {
        if (state.victimSocketId === socket.id) {
          io.to(roomId).emit('cancel_alert', {
            roomId,
            message: 'Victim lost connection. SOS closed.',
          });
          await cleanupRoom(roomId, redisClient);
          return;
        }
      }

      if (activeRoomId && activeEmergencyRooms.has(activeRoomId)) {
        const state = activeEmergencyRooms.get(activeRoomId);
        if (state && state.assignedHelperIds.includes(userId)) {
          state.assignedHelperIds = state.assignedHelperIds.filter((id) => id !== userId);
          io.to(`user:${state.victimUserId}`).emit('helper_response_cancelled', {
            roomId: activeRoomId,
            helperId: userId,
            acceptedHelperIds: state.assignedHelperIds,
            reason: 'Assigned helper disconnected.',
          });
          await redisClient.sadd(state.redisNotifiedKey, String(userId));
          if (state.assignedHelperIds.length === 0 && !state.currentSosTimeoutId) {
            await startAutomatedDispatchLoop(io, redisClient, activeRoomId);
          }
        }
      }
    });
  });
};

async function upsertLiveLocation(redisClient, userId, location) {
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const newCell = h3.latLngToCell(lat, lng, H3_RESOLUTION);
  const previous = await redisClient.hgetall(`last-location:${userId}`);
  const pipeline = redisClient.multi();

  if (previous && previous.region && previous.region !== newCell) {
    pipeline.srem(`active-users:${previous.region}`, userId);
  }

  pipeline.sadd(`active-users:${newCell}`, userId);
  pipeline.hset(`last-location:${userId}`, {
    lat: String(lat),
    long: String(lng),
    region: newCell,
    lastUpdated: String(Date.now()),
  });

  await pipeline.exec();
}

function emitSearchProgress(io, state, searchMetadata) {
  const ring = Number(searchMetadata?.searchedRing) || 0;
  const radiusMeters = Number(searchMetadata?.radiusMeters) || 250;
  io.to(`user:${state.victimUserId}`).emit('dispatch_search_progress', {
    roomId: state.roomId,
    ring,
    radiusMeters,
  });

  io.to(`user:${state.victimUserId}`).emit('search_expanded', {
    roomId: state.roomId,
    ring,
    radiusMeters,
  });

  if (searchMetadata?.maxRadiusReached) {
    io.to(`user:${state.victimUserId}`).emit('max_radius_reached', {
      roomId: state.roomId,
      radiusMeters,
    });
  }
}

async function startAutomatedDispatchLoop(io, redisClient, roomId) {
  const state = activeEmergencyRooms.get(roomId);
  if (!state || state.assignedHelperIds.length > 0) return;

  if (state.currentSosTimeoutId) {
    clearTimeout(state.currentSosTimeoutId);
    state.currentSosTimeoutId = null;
  }

  state.currentBatchHelperIds = [];

  const { currentVictimLocation, redisNotifiedKey, victimUserId } = state;
  const alreadyNotified = await redisClient.smembers(redisNotifiedKey);
  let searchRing = Math.max(0, Number(state.currentSearchRing) || 0);
  let helpers = [];
  let searchMetadata = {
    searchedRing: searchRing,
    radiusMeters: 250,
    maxRadiusReached: false,
  };

  while (true) {
    const searchResult = await triggerSOS(
      currentVictimLocation.lat,
      currentVictimLocation.lng,
      alreadyNotified,
      redisClient,
      {
        maxRing: searchRing,
        minResults: NOTIFY_BATCH_SIZE,
        maxResults: SEARCH_POOL_LIMIT,
      }
    );

    helpers = (searchResult.helpers || []).filter((helper) => helper.userId !== victimUserId);
    searchMetadata = {
      searchedRing: Number(searchResult.searchedRing) || 0,
      radiusMeters: Number(searchResult.radiusMeters) || 250,
      maxRadiusReached: Boolean(searchResult.maxRadiusReached),
    };
    state.currentSearchRing = searchMetadata.searchedRing;
    emitSearchProgress(io, state, searchMetadata);

    if (helpers.length >= NOTIFY_BATCH_SIZE || searchMetadata.maxRadiusReached) {
      break;
    }

    searchRing = Math.min(searchMetadata.searchedRing + SEARCH_RING_STEP, MAX_SEARCH_RING);
  }

  if (!helpers.length) {
    io.to(`user:${victimUserId}`).emit('escalate_to_911', { roomId });
    return;
  }

  const victim = await User.findById(victimUserId).select('name').lean();
  const batch = helpers.slice(0, NOTIFY_BATCH_SIZE);
  const helperIds = batch.map((helper) => helper.userId);
  state.currentBatchHelperIds = helperIds;

  io.to(`user:${victimUserId}`).emit(`sos_helpers_${roomId}`, { roomId, helpers: batch });

  for (const helper of batch) {
    io.to(`user:${helper.userId}`).emit('incoming_sos', {
      roomId,
      victimUserId,
      victimName: victim?.name || victimUserId,
      victimLocation: currentVictimLocation,
      helperDistanceMeters: helper.distance,
    });
  }

  await alertHelpersViaFCM(batch, {
    roomId,
    victimUserId,
    victimName: victim?.name || victimUserId,
    victimLocation: currentVictimLocation,
  });

  if (helperIds.length > 0) {
    await redisClient.sadd(redisNotifiedKey, ...helperIds);
  }

  state.currentSosTimeoutId = setTimeout(() => {
    const latestState = activeEmergencyRooms.get(roomId);
    if (!latestState) {
      return;
    }

    latestState.currentSosTimeoutId = null;
    latestState.currentBatchHelperIds = [];

    if (latestState.assignedHelperIds.length > 0) {
      return;
    }

    startAutomatedDispatchLoop(io, redisClient, roomId);
  }, DISPATCH_TIMEOUT_MS);
}

async function cleanupRoom(roomId, redisClient, options = {}) {
  const state = activeEmergencyRooms.get(roomId);
  if (!state) {
    return;
  }

  if (state.currentSosTimeoutId) {
    clearTimeout(state.currentSosTimeoutId);
  }

  if (!options.skipRedisCleanup) {
    try {
      await redisClient.del(state.redisNotifiedKey);
    } catch (error) {
      console.error('[SOS] Failed to cleanup notified helper set:', error.message);
    }
  }

  activeEmergencyRooms.delete(roomId);
}
