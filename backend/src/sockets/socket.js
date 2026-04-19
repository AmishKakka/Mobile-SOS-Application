const { randomUUID } = require('crypto');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const h3 = require('h3-js');
const admin = require('firebase-admin');
const { triggerSOS } = require('../services/dynamicProximitySearch');
const { alertHelpersViaFCM, alertEmergencyContacts } = require('../services/fcmService');
const User = require('../models/User');
const { HELPER_STATUS_TTL_SECONDS } = require('../services/helperAvailabilityIndex');
const { verifyIdToken } = require('../services/cognitoVerifier');
const { incidentTelemetryStore } = require('../services/incidentTelemetryStore');

const H3_RESOLUTION = Number(process.env.H3_RESOLUTION || 9);
const LAST_LOCATION_TTL_SECONDS = Math.max(
  60,
  Number(process.env.REDIS_LAST_LOCATION_TTL_SECONDS || 900),
);
const DISPATCH_TIMEOUT_MS = Number(process.env.SOS_DISPATCH_TIMEOUT_MS || 30000);
const NOTIFY_BATCH_SIZE = Number(process.env.SOS_NOTIFY_BATCH_SIZE || 5);
const MAX_SEARCH_RING = Number(process.env.SOS_MAX_RINGS || 11);
const SEARCH_RING_STEP = Math.max(1, Number(process.env.SOS_SEARCH_RING_STEP || 1));
const SEARCH_POOL_LIMIT = Math.max(
  NOTIFY_BATCH_SIZE,
  Number(process.env.SOS_SEARCH_POOL_LIMIT || 100),
);

const activeEmergencyRooms = new Map();

function runTelemetry(label, task) {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error(`[TELEMETRY] ${label} failed:`, error.message);
    });
}

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

async function patchExistingUser(userId, update) {
  if (!userId || !update || Object.keys(update).length === 0) {
    return;
  }

  try {
    const result = await User.updateOne(
      { _id: userId },
      { $set: update },
      { upsert: false },
    );

    if (!result.matchedCount) {
      console.warn(`[SOCKET] Skipped user patch for missing user ${userId}`);
    }
  } catch (error) {
    console.error('[SOCKET] Failed to patch existing user:', error.message);
  }
}

function requireSocketIdentity(socket, message = 'Socket user is not registered.') {
  const userId = String(socket.data.userId || '').trim();
  if (!userId) {
    socket.emit('error_msg', { message });
    return null;
  }
  return userId;
}

function requireMatchingUser(socket, candidateUserId, fieldName) {
  const socketUserId = requireSocketIdentity(socket);
  if (!socketUserId) {
    return null;
  }

  if (String(candidateUserId || '').trim() !== socketUserId) {
    socket.emit('error_msg', {
      message: `${fieldName} does not match the authenticated socket user.`,
    });
    return null;
  }

  return socketUserId;
}

module.exports = function initializeSocket(server, redisClient, pubClient, subClient) {
  initializeFirebase();
  incidentTelemetryStore.initialize().catch((error) => {
    console.error('[TELEMETRY] Initialization failed:', error.message);
  });

  const io = new Server(server, { cors: { origin: '*' } });
  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected ${socket.id}`);

    socket.on('register_user', async (payload = {}) => {
      const token = String(payload.token || '').trim();
      const role = ['victim', 'helper', 'contact'].includes(payload.role)
        ? payload.role
        : 'victim';
      const name = typeof payload.name === 'string' ? payload.name.trim() : undefined;

      try {
        const claims = await verifyIdToken(token);
        const user = await User.findOne({ cognitoId: claims.sub }).select('_id name').lean();

        if (!user?._id) {
          socket.emit('error_msg', {
            message: 'Authenticated user profile was not found. Sync profile first.',
          });
          return;
        }

        const userId = String(user._id);
        const requestedUserId = String(payload.userId || '').trim();
        if (requestedUserId && requestedUserId !== userId) {
          socket.emit('error_msg', {
            message: 'register_user userId does not match the authenticated user.',
          });
          return;
        }

        socket.data.userId = userId;
        socket.data.cognitoId = claims.sub;
        socket.data.role = role;
        socket.join(`user:${userId}`);

        await patchExistingUser(userId, {
          ...(name ? { name } : user?.name ? { name: user.name } : {}),
          role,
        });

        socket.emit('registered', { userId, role });
      } catch (error) {
        console.error('[SOCKET] Failed to verify register_user token:', error.message);
        socket.emit('error_msg', {
          message: 'Socket authentication failed. Please sign in again.',
        });
      }
    });

    socket.on('my_location_updated', async (payload = {}) => {
      const userId = requireMatchingUser(socket, payload.userId, 'my_location_updated userId');
      const lat = Number(payload.lat);
      const lng = Number(payload.lng);

      if (!userId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        socket.emit('error_msg', { message: 'my_location_updated requires userId, lat and lng.' });
        return;
      }

      await upsertLiveLocation(redisClient, userId, { lat, lng });
      await patchExistingUser(userId, {
        lastKnownLocation: {
          lat,
          lng,
          updatedAt: new Date(),
        },
      });
    });

    socket.on('bulk_location_update', async (payload = {}) => {
      const userId = requireMatchingUser(socket, payload.userId, 'bulk_location_update userId');
      const { locations } = payload;
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
      const userId = requireMatchingUser(socket, payload.userId, 'sos_trigger userId');
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
        const incidentId = `${roomId}_${Date.now()}_${randomUUID().slice(0, 8)}`;

        if (activeEmergencyRooms.has(roomId)) {
          await cleanupRoom(roomId, redisClient, { clearRedisOnly: true });
        }

        socket.join(roomId);
        activeEmergencyRooms.set(roomId, {
          incidentId,
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

        await patchExistingUser(userId, {
          lastKnownLocation: {
            lat: victimLocation.lat,
            lng: victimLocation.lng,
            updatedAt: new Date(),
          },
        });

        runTelemetry('logIncidentCreated', () =>
          incidentTelemetryStore.logIncidentCreated({
            incidentId,
            roomId,
            victimUserId: userId,
            location: victimLocation,
          }),
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

      const state = activeEmergencyRooms.get(roomId);
      const socketUserId = requireSocketIdentity(socket);
      if (!state || !socketUserId || state.victimUserId !== socketUserId) {
        socket.emit('error_msg', { message: 'Only the victim can cancel this SOS.' });
        return;
      }

      io.to(roomId).emit('cancel_alert', {
        roomId,
        message: 'The victim cancelled the SOS request.',
      });

      runTelemetry('logIncidentCancelled', () =>
        incidentTelemetryStore.logIncidentClosed({
          incidentId: state.incidentId,
          roomId,
          finalStatus: 'CANCELLED',
          reason: 'victim_cancelled',
        }),
      );

      await cleanupRoom(roomId, redisClient);
    });

    socket.on('helper_accept', async ({ helperId, helperName, roomId } = {}, ack = () => { }) => {
      const authenticatedHelperId = requireMatchingUser(socket, helperId, 'helper_accept helperId');
      if (!roomId || !authenticatedHelperId) {
        ack({ ok: false, message: 'helper_accept requires roomId and helperId.' });
        return;
      }

      const state = activeEmergencyRooms.get(roomId);
      if (!state) {
        socket.emit('error_msg', { message: 'Incident no longer exists.' });
        ack({ ok: false, message: 'Incident no longer exists.' });
        return;
      }

      if (state.assignedHelperIds.includes(authenticatedHelperId)) {
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

      state.assignedHelperIds.push(authenticatedHelperId);

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
        helperId: authenticatedHelperId,
        helperName: helperName || authenticatedHelperId,
        acceptedHelperIds: state.assignedHelperIds,
        acceptedCount: state.assignedHelperIds.length,
        message:
          state.assignedHelperIds.length > 1
            ? `${state.assignedHelperIds.length} helpers accepted your SOS and are on the way.`
            : 'A helper accepted your SOS and is on the way.',
      });

      runTelemetry('logHelperAccepted', () =>
        incidentTelemetryStore.logHelperAccepted({
          incidentId: state.incidentId,
          roomId,
          helperId: authenticatedHelperId,
          helperName: helperName || authenticatedHelperId,
        }),
      );
    });

    socket.on('helper_reject', async ({ helperId, roomId } = {}) => {
      const authenticatedHelperId = requireMatchingUser(socket, helperId, 'helper_reject helperId');
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !authenticatedHelperId) {
        return;
      }

      try {
        await redisClient.sadd(state.redisNotifiedKey, String(authenticatedHelperId));
      } catch (error) {
        console.error('[SOS] Failed to mark rejected helper:', error.message);
      }

      runTelemetry('logHelperDeclined', () =>
        incidentTelemetryStore.logHelperDeclined({
          incidentId: state.incidentId,
          roomId,
          helperId: authenticatedHelperId,
        }),
      );
    });

    socket.on('victim_location_update', async ({ roomId, location } = {}) => {
      const state = activeEmergencyRooms.get(roomId);
      const socketUserId = requireSocketIdentity(socket);
      if (!state || !socketUserId || state.victimUserId !== socketUserId || !isValidLocation(location)) {
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
      const authenticatedHelperId = requireMatchingUser(socket, helperId, 'helper_location_update helperId');
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !authenticatedHelperId || !isValidLocation(location)) {
        return;
      }

      const nextLocation = {
        lat: Number(location.lat),
        lng: Number(location.lng),
      };

      await upsertLiveLocation(redisClient, authenticatedHelperId, nextLocation);
      io.to(`user:${state.victimUserId}`).emit('update_helper_pin', {
        helperId: authenticatedHelperId,
        location: nextLocation,
      });

      runTelemetry('recordHelperMovement', () =>
        incidentTelemetryStore.recordHelperMovement({
          incidentId: state.incidentId,
          helperId: authenticatedHelperId,
          location: nextLocation,
          victimLocation: state.currentVictimLocation,
        }),
      );
    });

    socket.on('helper_response_cancelled', async ({ roomId, helperId, reason } = {}) => {
      const authenticatedHelperId = requireMatchingUser(socket, helperId, 'helper_response_cancelled helperId');
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !authenticatedHelperId || !state.assignedHelperIds.includes(authenticatedHelperId)) {
        return;
      }

      state.assignedHelperIds = state.assignedHelperIds.filter((id) => id !== authenticatedHelperId);
      socket.leave(roomId);

      io.to(`user:${state.victimUserId}`).emit('helper_response_cancelled', {
        roomId,
        helperId: authenticatedHelperId,
        acceptedHelperIds: state.assignedHelperIds,
        reason: reason || 'The helper stopped responding.',
      });

      await redisClient.sadd(state.redisNotifiedKey, String(authenticatedHelperId));

      runTelemetry('logHelperCancelled', () =>
        incidentTelemetryStore.logHelperCancelled({
          incidentId: state.incidentId,
          roomId,
          helperId: authenticatedHelperId,
          reason: reason || 'helper_response_cancelled',
        }),
      );

      if (state.assignedHelperIds.length === 0 && !state.currentSosTimeoutId) {
        await startAutomatedDispatchLoop(io, redisClient, roomId);
      }
    });

    socket.on('helper_response_completed', async ({ roomId, helperId, outcome, notes } = {}) => {
      const authenticatedHelperId = requireMatchingUser(socket, helperId, 'helper_response_completed helperId');
      const state = activeEmergencyRooms.get(roomId);
      if (!state || !authenticatedHelperId || !state.assignedHelperIds.includes(authenticatedHelperId)) {
        return;
      }

      if (outcome === 'cannot_handle') {
        state.assignedHelperIds = state.assignedHelperIds.filter((id) => id !== authenticatedHelperId);

        io.to(`user:${state.victimUserId}`).emit('helper_response_cancelled', {
          roomId,
          helperId: authenticatedHelperId,
          acceptedHelperIds: state.assignedHelperIds,
          reason: notes || 'A helper could not handle this incident.',
        });

        await redisClient.sadd(state.redisNotifiedKey, String(authenticatedHelperId));

        runTelemetry('logHelperCancelled', () =>
          incidentTelemetryStore.logHelperCancelled({
            incidentId: state.incidentId,
            roomId,
            helperId: authenticatedHelperId,
            reason: notes || 'cannot_handle',
          }),
        );

        if (state.assignedHelperIds.length === 0 && !state.currentSosTimeoutId) {
          await startAutomatedDispatchLoop(io, redisClient, roomId);
        }
        return;
      }

      io.to(roomId).emit('incident_resolved', {
        roomId,
        helperId: authenticatedHelperId,
        outcome: outcome || 'helped',
        notes: notes || '',
      });

      runTelemetry('logIncidentCompleted', () =>
        incidentTelemetryStore.logIncidentClosed({
          incidentId: state.incidentId,
          roomId,
          helperId: authenticatedHelperId,
          finalStatus: 'COMPLETED',
          reason: outcome || 'helped',
          notes: notes || '',
        }),
      );

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
          runTelemetry('logIncidentCancelled', () =>
            incidentTelemetryStore.logIncidentClosed({
              incidentId: state.incidentId,
              roomId,
              finalStatus: 'CANCELLED',
              reason: 'victim_disconnected',
            }),
          );
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
          runTelemetry('logHelperCancelled', () =>
            incidentTelemetryStore.logHelperCancelled({
              incidentId: state.incidentId,
              roomId: activeRoomId,
              helperId: userId,
              reason: 'helper_disconnected',
            }),
          );
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
  const [previous, helperStatus] = await Promise.all([
    redisClient.hgetall(`last-location:${userId}`),
    redisClient.hgetall(`helper-status:${userId}`),
  ]);
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
  pipeline.expire(`last-location:${userId}`, LAST_LOCATION_TTL_SECONDS);

  if (helperStatus && Object.keys(helperStatus).length > 0) {
    const helperRole = helperStatus.role || 'victim';
    const helperAvailable = helperStatus.isAvailable === 'true';
    const previousHelperRegion = helperStatus.region || '';
    const isEligibleHelper = helperRole === 'helper' && helperAvailable;

    pipeline.hset(`helper-status:${userId}`, {
      role: helperRole,
      isAvailable: helperAvailable ? 'true' : 'false',
      region: newCell,
      lastUpdated: String(Date.now()),
    });
    pipeline.expire(`helper-status:${userId}`, HELPER_STATUS_TTL_SECONDS);

    if (previousHelperRegion && previousHelperRegion !== newCell) {
      pipeline.srem(`available-helpers:${previousHelperRegion}`, userId);
    }

    if (isEligibleHelper) {
      pipeline.sadd(`available-helpers:${newCell}`, userId);
    } else if (previousHelperRegion) {
      pipeline.srem(`available-helpers:${previousHelperRegion}`, userId);
    }
  }

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

  runTelemetry('logHelpersAssigned', () =>
    incidentTelemetryStore.logHelpersAssigned({
      incidentId: state.incidentId,
      roomId,
      victimLocation: currentVictimLocation,
      helpers: batch,
    }),
  );

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

  incidentTelemetryStore.clearIncident(state.incidentId);
  activeEmergencyRooms.delete(roomId);
}
