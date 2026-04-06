const h3 = require('h3-js');

const MAX_RINGS = 11;
const MAX_HELPERS = 5;
const H3_RESOLUTION = 9;

async function triggerSOS(victimLat, victimLng, rejectIds = [], redisClient) {
  if (!Number.isFinite(victimLat) || !Number.isFinite(victimLng)) {
    throw new TypeError('victimLat and victimLng must be valid numbers.');
  }
  if (!redisClient) throw new Error('redisClient must be provided.');

  const rejectIdsSet = new Set(rejectIds.map(String));
  const victimCell = h3.latLngToCell(victimLat, victimLng, H3_RESOLUTION);

  let helpersPool = (await redisClient.smembers(`active-users:${victimCell}`))
    .filter((userId) => !rejectIdsSet.has(userId));

  let currentRing = 1;
  while (helpersPool.length < MAX_HELPERS && currentRing <= MAX_RINGS) {
    const ringCells = h3.gridRing(victimCell, currentRing);

    for (const cell of ringCells) {
      const ringHelpers = (await redisClient.smembers(`active-users:${cell}`))
        .filter((userId) => !rejectIdsSet.has(userId));
      helpersPool = [...new Set([...helpersPool, ...ringHelpers])];
    }
    if (helpersPool.length >= MAX_HELPERS) break;
    currentRing++;
  }

  if (helpersPool.length === 0) return [];

  const pipeline = redisClient.multi();
  for (const helperId of helpersPool) {
    pipeline.hgetall(`last-location:${helperId}`);
  }

  const results = await pipeline.exec();
  const helpersDetail = [];

  for (let i = 0; i < results.length; i++) {
    const [error, locationData] = results[i];
    if (error || !locationData || !locationData.lat || !locationData.long) continue;

    const helperLat = parseFloat(locationData.lat);
    const helperLng = parseFloat(locationData.long);
    const distance = calculateDistance(victimLat, victimLng, helperLat, helperLng);

    helpersDetail.push({
      userId: helpersPool[i],
      distance,
      lat: helperLat,
      long: helperLng,
    });
  }

  helpersDetail.sort((a, b) => a.distance - b.distance);
  return helpersDetail.slice(0, MAX_HELPERS);
}

function calculateDistance(victimLat, victimLng, lat2, long2) {
  const earthRadiusMeters = 6371e3;
  const dLat = (lat2 - victimLat) * Math.PI / 180;
  const dLon = (long2 - victimLng) * Math.PI / 180;
  const phi1 = victimLat * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

module.exports = { triggerSOS };