#!/usr/bin/env node
const { randomUUID } = require('crypto');
const { TelemetryStore, haversineMeters } = require('./telemetryStore');

const TICK_MS = 5000;
const MAX_TICKS = 84;
const VICTIM = { lat: 33.4484, lng: -112.074 };

const helperProfiles = [
  {
    helperId: 'helper_001',
    name: 'Alex R',
    lat: 33.4522,
    lng: -112.0808,
    stepMeters: 14,
    behavior: 'steady',
  },
  {
    helperId: 'helper_002',
    name: 'Priya M',
    lat: 33.4518,
    lng: -112.0802,
    stepMeters: 12,
    behavior: 'short_stop',
  },
  {
    helperId: 'helper_003',
    name: 'Carlos D',
    lat: 33.4532,
    lng: -112.0821,
    stepMeters: 10,
    behavior: 'long_stop',
  },
  {
    helperId: 'helper_004',
    name: 'Sara L',
    lat: 33.4513,
    lng: -112.0791,
    stepMeters: 11,
    behavior: 'route_deviation',
  },
  {
    helperId: 'helper_005',
    name: 'James T',
    lat: 33.452,
    lng: -112.0804,
    stepMeters: 13,
    behavior: 'network_gap',
  },
];

function getBearingRad(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

function moveByMeters(point, bearingRad, meters) {
  const R = 6371000;
  const dByR = meters / R;
  const lat1 = (point.lat * Math.PI) / 180;
  const lng1 = (point.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) +
      Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearingRad),
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(dByR) * Math.cos(lat1),
      Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

function moveTowards(point, target, stepMeters) {
  const dist = haversineMeters(point.lat, point.lng, target.lat, target.lng);
  if (dist <= stepMeters) return { ...target };
  const bearing = getBearingRad(point, target);
  return moveByMeters(point, bearing, stepMeters);
}

function moveAway(point, target, stepMeters) {
  const awayBearing = getBearingRad(target, point);
  return moveByMeters(point, awayBearing, stepMeters);
}

function shouldSkipTick(helper, tick) {
  if (helper.behavior === 'network_gap' && tick >= 16 && tick <= 22) return true;
  return false;
}

function getStepForTick(helper, tick) {
  if (helper.behavior === 'short_stop' && tick >= 12 && tick <= 18) return 0;
  if (helper.behavior === 'long_stop' && tick >= 10 && tick <= 26) return 0;
  return helper.stepMeters + (Math.random() * 1.4 - 0.7);
}

function nextPoint(helper, tick) {
  const current = { lat: helper.lat, lng: helper.lng };
  if (helper.behavior === 'route_deviation' && tick >= 20 && tick <= 28) {
    return moveAway(current, VICTIM, helper.stepMeters);
  }

  const step = getStepForTick(helper, tick);
  if (step <= 0) return current;
  return moveTowards(current, VICTIM, step);
}

async function main() {
  const store = new TelemetryStore();
  const incidentId = `sim_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const personInNeedId = 'pin_demo_001';
  const startedAt = new Date();
  const helpers = helperProfiles.map((h) => ({ ...h }));

  try {
    await store.initialize();
    await store.createIncident({
      incidentId,
      personInNeedId,
      location: VICTIM,
      incidentType: 'MEDICAL',
    });

    await store.assignHelpers({
      incidentId,
      helpers: helpers.map((h) => ({
        userId: h.helperId,
        name: h.name,
        lat: h.lat,
        lng: h.lng,
        distance: haversineMeters(h.lat, h.lng, VICTIM.lat, VICTIM.lng),
      })),
    });

    await store.markHelperAccepted({
      incidentId,
      helperId: helpers[0].helperId,
      helperName: helpers[0].name,
      ts: new Date(startedAt.getTime() + TICK_MS),
    });

    console.log(`Simulation started for incidentId=${incidentId}`);

    for (let tick = 0; tick < MAX_TICKS; tick += 1) {
      const ts = new Date(startedAt.getTime() + tick * TICK_MS);
      for (const helper of helpers) {
        if (shouldSkipTick(helper, tick)) continue;

        const point = nextPoint(helper, tick);
        helper.lat = point.lat;
        helper.lng = point.lng;

        const result = await store.recordHelperPing({
          incidentId,
          helperId: helper.helperId,
          location: { lat: helper.lat, lng: helper.lng },
          ts,
        });

        if (result.emittedEventTypes.length > 0) {
          console.log(
            `tick=${tick} helper=${helper.helperId} distance=${result.distanceToPinM} events=${result.emittedEventTypes.join(', ')}`,
          );
        }
      }
    }

    await store.closeIncident({
      incidentId,
      status: 'COMPLETED',
      resolution: 'HELPER_RESOLVED',
      reason: 'SIMULATION_FINISHED',
      ts: new Date(startedAt.getTime() + MAX_TICKS * TICK_MS),
    });

    const stats = await store.getStats({ incidentId });
    console.log('\nSimulation complete');
    console.log(`incidentId: ${incidentId}`);
    console.log(`events: ${stats.eventCount}`);
    console.log(`tracks: ${stats.trackCount}`);
    console.log('event type breakdown:');
    Object.keys(stats.eventTypes)
      .sort()
      .forEach((eventType) => {
        console.log(`  ${eventType}: ${stats.eventTypes[eventType]}`);
      });

    console.log(
      `\nView timeline: node addons/incident-telemetry/showIncidentTimeline.js ${incidentId}`,
    );
  } catch (err) {
    console.error('Simulation failed:', err);
    process.exitCode = 1;
  } finally {
    await store.close();
  }
}

main();
