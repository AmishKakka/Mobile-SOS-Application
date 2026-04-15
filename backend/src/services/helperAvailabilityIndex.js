const h3 = require('h3-js');

const H3_RESOLUTION = Number(process.env.H3_RESOLUTION || 9);
const HELPER_STATUS_TTL_SECONDS = Math.max(
  60,
  Number(process.env.REDIS_HELPER_STATUS_TTL_SECONDS || 900),
);

function isFiniteLocation(location) {
  return (
    location
    && Number.isFinite(Number(location.lat))
    && Number.isFinite(Number(location.lng))
  );
}

function computeRegion(location) {
  if (!isFiniteLocation(location)) {
    return null;
  }

  return h3.latLngToCell(
    Number(location.lat),
    Number(location.lng),
    H3_RESOLUTION,
  );
}

async function resolveRegion(redisClient, userId, fallbackLocation) {
  const redisLocation = await redisClient.hgetall(`last-location:${userId}`);
  if (redisLocation?.region) {
    return redisLocation.region;
  }

  return computeRegion(fallbackLocation);
}

async function syncHelperAvailabilityIndex(redisClient, user = {}) {
  if (!redisClient) {
    throw new Error('redisClient is required.');
  }

  const userId = String(user._id || '').trim();
  if (!userId) {
    throw new Error('user._id is required to sync helper availability.');
  }

  const previousStatus = await redisClient.hgetall(`helper-status:${userId}`);
  const role = typeof user.role === 'string' ? user.role : 'victim';
  const isAvailable = Boolean(user.isHelperAvailable);
  const region = await resolveRegion(redisClient, userId, user.lastKnownLocation);
  const isEligibleHelper = role === 'helper' && isAvailable && Boolean(region);

  const pipeline = redisClient.multi();
  pipeline.hset(`helper-status:${userId}`, {
    role,
    isAvailable: isAvailable ? 'true' : 'false',
    region: region || '',
    lastUpdated: String(Date.now()),
  });
  pipeline.expire(`helper-status:${userId}`, HELPER_STATUS_TTL_SECONDS);

  const previousRegion = previousStatus?.region || '';
  if (previousRegion && (!isEligibleHelper || previousRegion !== region)) {
    pipeline.srem(`available-helpers:${previousRegion}`, userId);
  }

  if (isEligibleHelper && region) {
    pipeline.sadd(`available-helpers:${region}`, userId);
  }

  await pipeline.exec();

  return {
    userId,
    role,
    isAvailable,
    region,
    isEligibleHelper,
  };
}

module.exports = {
  HELPER_STATUS_TTL_SECONDS,
  syncHelperAvailabilityIndex,
};
