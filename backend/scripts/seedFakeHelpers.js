const Redis = require('ioredis');
const h3    = require('h3-js');

const redis = new Redis({ host: process.env.REDIS_HOST || '127.0.0.1', port: 6379 });
const H3_RESOLUTION = 9;

// How often the simulation ticks (ms). Each tick moves the helper ~300m.
const TICK_MS = 5000;
// How many ticks to run before stopping (0 = run forever)
const MAX_TICKS = 0;

const VICTIM = { lat: 33.4150, lng: -111.9085 };

const FAKE_HELPERS = [
  { userId: 'helper_001', name: 'Alex R.',    lat: 33.4162, lng: -111.9071, headingDeg: 45  },
  { userId: 'helper_002', name: 'Priya M.',   lat: 33.4138, lng: -111.9102, headingDeg: 120 },
  { userId: 'helper_003', name: 'Carlos D.',  lat: 33.4175, lng: -111.9055, headingDeg: 20 },
  { userId: 'helper_004', name: 'Sara L.',    lat: 33.4128, lng: -111.9120, headingDeg: 300 },
  { userId: 'helper_005', name: 'James T.',   lat: 33.4190, lng: -111.9095, headingDeg: 80  },
  { userId: 'helper_006', name: 'Nina K.',    lat: 33.4145, lng: -111.9060, headingDeg: 160 },
  { userId: 'helper_007', name: 'Omar F.',    lat: 33.4108, lng: -111.9075, headingDeg: 240 },
  { userId: 'helper_008', name: 'Lena P.',    lat: 33.4200, lng: -111.9110, headingDeg: 350 },
  { userId: 'helper_009', name: 'Ravi S.',    lat: 33.4135, lng: -111.9040, headingDeg: 15  },
  { userId: 'helper_010', name: 'Fatima H.',  lat: 33.4160, lng: -111.9130, headingDeg: 90 },
];


/**
 * Moves a lat/lng point by `distanceMeters` in `headingDeg` direction.
 * Returns the new { lat, lng }.
 */
function movePoint(lat, lng, distanceMeters, headingDeg) {
  const R       = 6371000;
  const dByR    = distanceMeters / R;
  const headRad = (headingDeg * Math.PI) / 180;
  const latRad  = (lat * Math.PI) / 180;
  const lngRad  = (lng * Math.PI) / 180;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(dByR) +
    Math.cos(latRad) * Math.sin(dByR) * Math.cos(headRad),
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(headRad) * Math.sin(dByR) * Math.cos(latRad),
      Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad),
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

/**
 *
 *   SADD  active-users:{h3Cell}   userId
 *   HSET  last-location:{userId}  lat  long  region
 *
 * If the helper moved to a NEW h3 cell, removes them from the old cell's SET first.
 */
async function writeHelperToRedis(helper, oldH3Cell = null) {
  const h3Cell = h3.latLngToCell(helper.lat, helper.lng, H3_RESOLUTION);

  const pipeline = redis.multi();

  // Remove from old cell if they crossed an H3 boundary
  if (oldH3Cell && oldH3Cell !== h3Cell) {
    pipeline.srem(`active-users:${oldH3Cell}`, helper.userId);
  }

  // Add to current cell's SET (SADD is idempotent — safe to call every tick)
  pipeline.sadd(`active-users:${h3Cell}`, helper.userId);

  // Store full location details for distance calculation
  pipeline.hset(`last-location:${helper.userId}`, {
    lat:    helper.lat.toString(),
    long:   helper.lng.toString(),
    region: h3Cell,
    name:   helper.name,
  });

  await pipeline.exec();
  return h3Cell;
}

/**
 * Seeds all 10 helpers into Redis at their starting positions.
 */
async function seedHelpers() {
  console.log('Seeding 10 fake helpers into Redis...\n');

  for (const helper of FAKE_HELPERS) {
    const h3Cell = await writeHelperToRedis(helper);
    console.log(
      `${helper.userId} (${helper.name}) → ` +
      `lat: ${helper.lat.toFixed(5)}, lng: ${helper.lng.toFixed(5)} ` +
      `| H3 cell: ${h3Cell}`,
    );
  }

  console.log('\nAll helpers seeded.\n');
}

/**
 * Simulation loop — moves each helper ~300m every TICK_MS milliseconds.
 * Logs when a helper crosses into a new H3 cell (relevant for SOS routing).
 */
async function startSimulation() {
  // Keep a live copy of each helper's state so we can mutate positions
  const state = FAKE_HELPERS.map((h) => ({ ...h }));

  // Track current H3 cell per helper so we can clean up on cell change
  const currentCells = {};
  for (const h of state) {
    currentCells[h.userId] = h3.latLngToCell(h.lat, h.lng, H3_RESOLUTION);
  }

  let tick = 0;

  const run = async () => {
    tick++;
    console.log(`\n📍 Tick ${tick} — moving all helpers ~300m...`);

    for (const helper of state) {
      const prevCell = currentCells[helper.userId];
      // Move 300m in the helper's heading direction
      const newPos = movePoint(helper.lat, helper.lng, 300, helper.headingDeg);
      helper.lat = newPos.lat;
      helper.lng = newPos.lng;

      // Slightly vary heading each tick so they don't walk in a straight line forever
      helper.headingDeg = (helper.headingDeg + (Math.random() * 30 - 15)) % 360;

      const newCell = await writeHelperToRedis(helper, prevCell);

      if (newCell !== prevCell) {
        console.log(
          `${helper.userId} crossed H3 boundary: ${prevCell} → ${newCell}`,
        );
      } else {
        console.log(
          `${helper.userId} → lat: ${helper.lat.toFixed(5)}, ` +
          `lng: ${helper.lng.toFixed(5)}`,
        );
      }

      currentCells[helper.userId] = newCell;
    }

    if (MAX_TICKS > 0 && tick >= MAX_TICKS) {
      console.log(`\nReached MAX_TICKS (${MAX_TICKS}). Stopping simulation.`);
      await redis.quit();
      return;
    }
    // Schedule next tick
    setTimeout(run, TICK_MS);
  };

  console.log(`🚶 Starting walk simulation — tick every ${TICK_MS / 1000}s, 300m per tick.\n`);
  setTimeout(run, TICK_MS);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await seedHelpers();
    await startSimulation();
  } catch (err) {
    console.error('Fatal error:', err);
    await redis.quit();
    process.exit(1);
  }
}

main();