const h3 = require('h3-js');

const MAX_RINGS = 18;
const MAX_HELPERS = 5;
const H3_RES = 9;
let _redisClient = null;

/**
 * Called once from socket.js to inject the shared Redis client.
 */
function setRedisClient(client) {
  _redisClient = client;
}

/**
 * triggerSOS
 * Expands outward from the victim's H3 cell ring by ring until
 * MAX_HELPERS are found or MAX_RINGS is exhausted.
 *
 * @param {number}   victimLat   - Victim latitude
 * @param {number}   victimLng   - Victim longitude
 * @param {string[]} rejectIds   - UserIds already notified (skip them)
 * @returns {Array}  Array of { userId, lat, long, distance, name }
 */
async function triggerSOS(victimLat, victimLng, rejectIds = []) {
  if (!Number.isFinite(victimLat) || !Number.isFinite(victimLng)) {
    throw new TypeError('victimLat and victimLng must be valid numbers.');
  }
  if (!_redisClient) {
    throw new Error('Redis client not set. Call setRedisClient() first.');
  }

  const redis        = _redisClient;
  const rejectSet    = new Set(rejectIds.map(String));
  const victimCell   = h3.latLngToCell(victimLat, victimLng, H3_RES);

  // Start with helpers in the victim's own cell
  let helpersPool = (await redis.smembers(`active-users:${victimCell}`))
    .filter(id => !rejectSet.has(id));

  // Expand ring by ring until we have enough
  let ring = 1;
  while (helpersPool.length < MAX_HELPERS && ring <= MAX_RINGS) {
    const ringCells = h3.gridRing(victimCell, ring);

    for (const cell of ringCells) {
      const cellHelpers = (await redis.smembers(`active-users:${cell}`))
        .filter(id => !rejectSet.has(id));
      helpersPool = [...new Set([...helpersPool, ...cellHelpers])];
    }

    if (helpersPool.length >= MAX_HELPERS) break;
    ring++;
  }

  if (helpersPool.length === 0) return [];

  // Fetch full location details for each helper in one pipeline
  const pipeline = redis.multi();
  for (const id of helpersPool) {
    pipeline.hgetall(`last-location:${id}`);
  }
  const results = await pipeline.exec();

  const helpersDetail = [];
  for (let i = 0; i < results.length; i++) {
    const [err, loc] = results[i];
    if (err || !loc?.lat || !loc?.long) continue;

    const helperLat = parseFloat(loc.lat);
    const helperLng = parseFloat(loc.long);
    const distance  = haversineMeters(victimLat, victimLng, helperLat, helperLng);

    helpersDetail.push({
      userId:   helpersPool[i],
      name:     loc.name || `Volunteer ${helpersPool[i].slice(-3)}`,
      lat:      helperLat,
      long:     helperLng,
      distance,
    });
  }

  helpersDetail.sort((a, b) => a.distance - b.distance);
  return helpersDetail.slice(0, MAX_HELPERS);
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { triggerSOS, setRedisClient };