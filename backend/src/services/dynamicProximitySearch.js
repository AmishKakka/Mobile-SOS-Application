const h3 = require('h3-js');
const User = require('../models/User');

const MAX_RINGS = Number(process.env.SOS_MAX_RINGS || 11);
const MAX_HELPERS = Number(process.env.SOS_MAX_HELPERS || 5);
const H3_RESOLUTION = Number(process.env.H3_RESOLUTION || 9);

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

  const rejected = new Set(rejectIds.map(String));
  const victimCell = h3.latLngToCell(victimLat, victimLng, H3_RESOLUTION);
  const helperIds = new Set();

  for (let ring = 0; ring <= maxRing; ring += 1) {
    const cells = ring === 0 ? [victimCell] : h3.gridRing(victimCell, ring);

    for (const cell of cells) {
      const activeHelpers = await redisClient.smembers(`active-users:${cell}`);
      activeHelpers
        .filter((userId) => !rejected.has(String(userId)))
        .forEach((userId) => helperIds.add(String(userId)));
    }

    if (helperIds.size >= minResults) break;
  }

  if (helperIds.size === 0) return [];

  const pipeline = redisClient.multi();
  for (const helperId of helperIds) {
    pipeline.hgetall(`last-location:${helperId}`);
  }

  const [locationResults, helperDocs] = await Promise.all([
    pipeline.exec(),
    User.find({
      _id: { $in: [...helperIds] },
      isHelperAvailable: true,
    })
      .select('_id name isHelperAvailable')
      .lean(),
  ]);

  const helperDocMap = new Map(helperDocs.map(doc => [String(doc._id), doc]));
  const helpers = [];

  for (let i = 0; i < locationResults.length; i++) {
    const helperId = [...helperIds][i];
    const [error, locationData] = locationResults[i] || [];
    if (error || !locationData?.lat || !locationData?.long) continue;

    const helperDoc = helperDocMap.get(helperId);
    if (!helperDoc) continue;   // Victim or non-helper is filtered out here

    const lat = Number.parseFloat(locationData.lat);
    const lng = Number.parseFloat(locationData.long);

    helpers.push({
      userId: helperId,
      name: helperDoc.name || helperId,
      lat,
      long: lng,
      distance: calculateDistance(victimLat, victimLng, lat, lng),
    });
  }

  helpers.sort((a, b) => a.distance - b.distance);
  return helpers.slice(0, maxResults);
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

module.exports = { triggerSOS, calculateDistance };
