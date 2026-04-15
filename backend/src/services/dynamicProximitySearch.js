const h3 = require('h3-js');
const User = require('../models/User');
const { HELPER_STATUS_TTL_SECONDS } = require('./helperAvailabilityIndex');

const MAX_RINGS = Number(process.env.SOS_MAX_RINGS || 11);
const MAX_HELPERS = Number(process.env.SOS_MAX_HELPERS || 5);
const H3_RESOLUTION = Number(process.env.H3_RESOLUTION || 9);
const MAX_RADIUS_METERS = Number(process.env.SOS_MAX_RADIUS_METERS || 2000);
const LAST_LOCATION_TTL_SECONDS = Math.max(
  60,
  Number(process.env.REDIS_LAST_LOCATION_TTL_SECONDS || 900),
);
const HELPER_STATUS_FRESHNESS_MS = HELPER_STATUS_TTL_SECONDS * 1000;
const LAST_LOCATION_FRESHNESS_MS = LAST_LOCATION_TTL_SECONDS * 1000;

function estimateRadiusForRing(victimCell, ring) {
  if (!victimCell || ring <= 0) {
    return 250;
  }

  const cells = h3.gridRing(victimCell, ring);
  const sampleCell = cells[0];
  if (!sampleCell) {
    return 250;
  }

  const [victimLat, victimLng] = h3.cellToLatLng(victimCell);
  const [ringLat, ringLng] = h3.cellToLatLng(sampleCell);

  return Math.max(
    250,
    Math.round(calculateDistance(victimLat, victimLng, ringLat, ringLng) + 150),
  );
}

function parseTimestampMs(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveEligibleHelpers(
  victimLat,
  victimLng,
  redisClient,
  helperIds,
  helperSourceCells,
) {
  if (!helperIds.size) {
    return [];
  }

  const candidateIds = [...helperIds];
  const locationPipeline = redisClient.multi();
  const statusPipeline = redisClient.multi();

  for (const helperId of candidateIds) {
    locationPipeline.hgetall(`last-location:${helperId}`);
    statusPipeline.hgetall(`helper-status:${helperId}`);
  }

  const [locationResults, statusResults, helperDocs] = await Promise.all([
    locationPipeline.exec(),
    statusPipeline.exec(),
    User.find({
      _id: { $in: candidateIds },
      role: 'helper',
      isHelperAvailable: true,
    })
      .select('_id name role isHelperAvailable')
      .lean(),
  ]);

  const helperDocMap = new Map(helperDocs.map((doc) => [String(doc._id), doc]));
  const helpers = [];
  const cleanupPipeline = redisClient.multi();
  let cleanupCount = 0;
  const now = Date.now();

  for (let i = 0; i < candidateIds.length; i += 1) {
    const helperId = candidateIds[i];
    const sourceCell = helperSourceCells.get(helperId);
    const [locationError, locationData] = locationResults[i] || [];
    const [statusError, statusData] = statusResults[i] || [];
    const helperDoc = helperDocMap.get(helperId);

    const scheduleRemoval = () => {
      if (sourceCell) {
        cleanupPipeline.srem(`available-helpers:${sourceCell}`, helperId);
        cleanupCount += 1;
      }
    };

    if (locationError || statusError || !helperDoc) {
      scheduleRemoval();
      continue;
    }

    const statusTimestamp = parseTimestampMs(statusData?.lastUpdated);
    const locationTimestamp = parseTimestampMs(locationData?.lastUpdated);
    const statusFresh = statusTimestamp !== null && now - statusTimestamp <= HELPER_STATUS_FRESHNESS_MS;
    const locationFresh = locationTimestamp !== null && now - locationTimestamp <= LAST_LOCATION_FRESHNESS_MS;

    if (
      !statusData
      || statusData.role !== 'helper'
      || statusData.isAvailable !== 'true'
      || !statusData.region
      || !statusFresh
      || !locationData?.lat
      || !locationData?.long
      || !locationData?.region
      || !locationFresh
      || locationData.region !== statusData.region
    ) {
      scheduleRemoval();
      continue;
    }

    if (sourceCell && sourceCell !== statusData.region) {
      scheduleRemoval();
      continue;
    }

    const lat = Number.parseFloat(locationData.lat);
    const lng = Number.parseFloat(locationData.long);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      scheduleRemoval();
      continue;
    }

    helpers.push({
      userId: helperId,
      name: helperDoc.name || helperId,
      lat,
      long: lng,
      distance: calculateDistance(victimLat, victimLng, lat, lng),
    });
  }

  if (cleanupCount > 0) {
    await cleanupPipeline.exec();
  }

  helpers.sort((a, b) => a.distance - b.distance);
  return helpers;
}

async function triggerSOS(victimLat, victimLng, rejectIds = [], redisClient, options = {}) {
  if (!Number.isFinite(victimLat) || !Number.isFinite(victimLng)) {
    throw new TypeError('victimLat and victimLng must be valid numbers.');
  }
  if (!redisClient) throw new Error('redisClient must be provided.');

  const requestedMaxRing = Number(options.maxRing);
  const maxRing = Number.isFinite(requestedMaxRing)
    ? Math.max(0, Math.min(Math.floor(requestedMaxRing), MAX_RINGS))
    : MAX_RINGS;
  const requestedMaxResults = Number(options.maxResults);
  const maxResults = Number.isFinite(requestedMaxResults)
    ? Math.max(1, Math.floor(requestedMaxResults))
    : MAX_HELPERS;
  const requestedMinResults = Number(options.minResults);
  const minResults = Number.isFinite(requestedMinResults)
    ? Math.max(1, Math.floor(requestedMinResults))
    : Math.min(MAX_HELPERS, maxResults);
  const requestedMaxRadiusMeters = Number(options.maxRadiusMeters);
  const maxRadiusMeters = Number.isFinite(requestedMaxRadiusMeters)
    ? Math.max(250, Math.min(Math.floor(requestedMaxRadiusMeters), MAX_RADIUS_METERS))
    : MAX_RADIUS_METERS;

  const rejected = new Set(rejectIds.map(String));
  const victimCell = h3.latLngToCell(victimLat, victimLng, H3_RESOLUTION);
  const helperIds = new Set();
  const helperSourceCells = new Map();
  let searchedRing = 0;
  let radiusMeters = 250;
  let maxRadiusReached = false;
  let eligibleHelpers = [];

  for (let ring = 0; ring <= maxRing; ring += 1) {
    const estimatedRadius = estimateRadiusForRing(victimCell, ring);
    if (ring > 0 && estimatedRadius > maxRadiusMeters) {
      maxRadiusReached = true;
      break;
    }

    searchedRing = ring;
    radiusMeters = Math.min(maxRadiusMeters, estimatedRadius);

    const cells = ring === 0 ? [victimCell] : h3.gridRing(victimCell, ring);

    for (const cell of cells) {
      const activeHelpers = await redisClient.smembers(`available-helpers:${cell}`);
      activeHelpers
        .filter((userId) => !rejected.has(String(userId)))
        .forEach((userId) => {
          const normalizedId = String(userId);
          helperIds.add(normalizedId);
          if (!helperSourceCells.has(normalizedId)) {
            helperSourceCells.set(normalizedId, cell);
          }
        });
    }

    if (helperIds.size > 0) {
      eligibleHelpers = await resolveEligibleHelpers(
        victimLat,
        victimLng,
        redisClient,
        helperIds,
        helperSourceCells,
      );
    }

    if (eligibleHelpers.length >= minResults) break;
  }

  if (searchedRing >= MAX_RINGS || radiusMeters >= maxRadiusMeters) {
    maxRadiusReached = true;
  }

  if (eligibleHelpers.length === 0) {
    return {
      helpers: [],
      searchedRing,
      radiusMeters,
      maxRadiusReached,
    };
  }

  return {
    helpers: eligibleHelpers.slice(0, maxResults),
    searchedRing,
    radiusMeters,
    maxRadiusReached,
  };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const earthRadiusMeters = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

module.exports = { triggerSOS, calculateDistance, estimateRadiusForRing };
