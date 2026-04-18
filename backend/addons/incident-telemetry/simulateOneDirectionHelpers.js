#!/usr/bin/env node
const { randomUUID } = require('crypto');
const { TelemetryStore, haversineMeters } = require('./telemetryStore');

const TICK_MS = 5000;
const MAX_TICKS = 90;

// Victim point (destination B)
const VICTIM = { lat: 33.4484, lng: -112.0740 };

// All helpers start to the WEST of victim and travel EAST towards victim.
const helpers = [
  {
    helperId: 'helper_west_001',
    name: 'Alex R',
    lat: 33.4489,
    lng: -112.0865,
    stepMeters: 16,
    behavior: 'steady',
  },
  {
    helperId: 'helper_west_002',
    name: 'Priya M',
    lat: 33.4483,
    lng: -112.0875,
    stepMeters: 15,
    behavior: 'short_stop',
  },
  {
    helperId: 'helper_west_003',
    name: 'Carlos D',
    lat: 33.4478,
    lng: -112.0888,
    stepMeters: 14,
    behavior: 'long_stop',
  },
  {
    helperId: 'helper_west_004',
    name: 'Sara L',
    lat: 33.4495,
    lng: -112.0902,
    stepMeters: 16,
    behavior: 'route_deviation',
  },
  {
    helperId: 'helper_west_005',
    name: 'James T',
    lat: 33.4475,
    lng: -112.0894,
    stepMeters: 15,
    behavior: 'network_gap',
  },
];

function bearingRad(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

function moveByMeters(point, bearing, meters) {
  const R = 6371000;
  const d = meters / R;
  const lat1 = (point.lat * Math.PI) / 180;
  const lng1 = (point.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

function moveTowards(point, target, meters) {
  const dist = haversineMeters(point.lat, point.lng, target.lat, target.lng);
  if (dist <= meters) return { ...target };
  return moveByMeters(point, bearingRad(point, target), meters);
}

function moveAway(point, target, meters) {
  return moveByMeters(point, bearingRad(target, point), meters);
}

function shouldSkipPing(helper, tick) {
  return helper.behavior === 'network_gap' && tick >= 20 && tick <= 28;
}

function stepForTick(helper, tick) {
  if (helper.behavior === 'short_stop' && tick >= 14 && tick <= 20) return 0;
  if (helper.behavior === 'long_stop' && tick >= 12 && tick <= 30) return 0;
  return helper.stepMeters + (Math.random() * 1.0 - 0.5);
}

function nextLocation(helper, tick) {
  const current = { lat: helper.lat, lng: helper.lng };

  if (helper.behavior === 'route_deviation' && tick >= 24 && tick <= 32) {
    return moveAway(current, VICTIM, helper.stepMeters);
  }

  const step = stepForTick(helper, tick);
  if (step <= 0) return current;
  return moveTowards(current, VICTIM, step);
}

async function main() {
  const store = new TelemetryStore();
  const incidentId = `sim_one_direction_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const startedAt = new Date();

  try {
    await store.initialize();

    await store.createIncident({
      incidentId,
      personInNeedId: 'pin_one_direction_001',
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

    console.log(`One-direction simulation started. incidentId=${incidentId}`);
    console.log('All helpers move west -> east toward victim, with controlled stop/deviation/gap behaviors.');

    for (let tick = 0; tick < MAX_TICKS; tick += 1) {
      const ts = new Date(startedAt.getTime() + tick * TICK_MS);

      for (const helper of helpers) {
        if (shouldSkipPing(helper, tick)) continue;

        const next = nextLocation(helper, tick);
        helper.lat = next.lat;
        helper.lng = next.lng;

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
    console.log('\nStored output summary');
    console.log(`incidentId: ${incidentId}`);
    console.log(`incident_events count: ${stats.eventCount}`);
    console.log(`incident_helper_tracks_ts count: ${stats.trackCount}`);
    console.log('event types:');
    Object.keys(stats.eventTypes)
      .sort()
      .forEach((key) => {
        console.log(`  ${key}: ${stats.eventTypes[key]}`);
      });

    console.log(
      `\nRead full timeline:\nnode addons/incident-telemetry/showIncidentTimeline.js ${incidentId}`,
    );
  } catch (err) {
    console.error('Simulation failed:', err);
    process.exitCode = 1;
  } finally {
    await store.close();
  }
}

main();
