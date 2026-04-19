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

function normalizeRole(role) {
  if (typeof role !== 'string') {
    return 'victim';
  }

  const normalized = role.trim().toLowerCase();
  if (normalized === 'helper') {
    return 'helper';
  }
  if (normalized === 'both') {
    return 'both';
  }
  if (normalized === 'contact') {
    return 'contact';
  }

  return 'victim';
}

function isHelperCapableUser(user = {}) {
  const normalizedRole = normalizeRole(user.role);
  const helperFlag = user.helperProfile?.isHelper;

  if (typeof helperFlag === 'boolean') {
    return helperFlag;
  }

  return normalizedRole === 'helper' || normalizedRole === 'both';
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
  const normalizedRole = normalizeRole(user.role);
  const isAvailable = Boolean(user.isHelperAvailable);
  const region = await resolveRegion(redisClient, userId, user.lastKnownLocation);
  const helperCapable = isHelperCapableUser(user);
  const helperStatusRole = helperCapable ? 'helper' : normalizedRole;
  const isEligibleHelper = helperCapable && isAvailable && Boolean(region);

  const pipeline = redisClient.multi();
  pipeline.hset(`helper-status:${userId}`, {
    role: helperStatusRole,
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
    role: helperStatusRole,
    isAvailable,
    region,
    isEligibleHelper,
  };
}

module.exports = {
  HELPER_STATUS_TTL_SECONDS,
  syncHelperAvailabilityIndex,
};
