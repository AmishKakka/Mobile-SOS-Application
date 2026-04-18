#!/usr/bin/env node
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const { TelemetryStore, haversineMeters } = require('./telemetryStore');

const TICK_MS = 5000;
const MAX_TICKS = 95;
const PIN_USER_ID = 'pin_whole_incident_001';
const VICTIM = { lat: 33.4484, lng: -112.0740 };

// 5 helpers with explicit behavior profiles for full-incident simulation.
const helpers = [
  {
    helperId: 'helper_full_001',
    name: 'Alex R',
    lat: 33.4489,
    lng: -112.0868,
    stepMeters: 16,
    behavior: 'accepted_primary',
  },
  {
    helperId: 'helper_full_002',
    name: 'Priya M',
    lat: 33.4482,
    lng: -112.0879,
    stepMeters: 14,
    behavior: 'declines_early',
  },
  {
    helperId: 'helper_full_003',
    name: 'Carlos D',
    lat: 33.4476,
    lng: -112.0889,
    stepMeters: 13,
    behavior: 'declines_late',
  },
  {
    helperId: 'helper_full_004',
    name: 'Sara L',
    lat: 33.4494,
    lng: -112.0898,
    stepMeters: 15,
    behavior: 'no_response_slow',
  },
  {
    helperId: 'helper_full_005',
    name: 'James T',
    lat: 33.4473,
    lng: -112.0904,
    stepMeters: 15,
    behavior: 'network_gap_then_resume',
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
  if (helper.behavior === 'declines_early' && tick >= 8) return true;
  if (helper.behavior === 'declines_late' && tick >= 20) return true;
  if (helper.behavior === 'network_gap_then_resume' && tick >= 24 && tick <= 32) return true;
  return false;
}

function stepForTick(helper, tick) {
  if (helper.behavior === 'accepted_primary' && tick >= 16 && tick <= 23) return 0; // short stop
  if (helper.behavior === 'no_response_slow' && tick >= 28 && tick <= 42) return 0; // long stop
  if (helper.behavior === 'network_gap_then_resume' && tick >= 48 && tick <= 56) return 0; // stop after resume
  return helper.stepMeters + (Math.random() * 1.0 - 0.5);
}

function nextLocation(helper, tick) {
  const current = { lat: helper.lat, lng: helper.lng };

  // Small temporary wrong-way segment for helper_full_004.
  if (helper.behavior === 'no_response_slow' && tick >= 12 && tick <= 16) {
    return moveAway(current, VICTIM, helper.stepMeters * 0.8);
  }

  const step = stepForTick(helper, tick);
  if (step <= 0) return current;
  return moveTowards(current, VICTIM, step);
}

function countEvent(events, eventType, helperId = null) {
  return events.filter(
    (ev) => ev.eventType === eventType && (helperId ? ev.helperId === helperId : true),
  ).length;
}

async function runSimulation() {
  const store = new TelemetryStore();
  const incidentId = `sim_whole_incident_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const startedAt = new Date();

  let closeAt = null;

  try {
    await store.initialize();

    // 1) PIN triggers SOS.
    await store.createIncident({
      incidentId,
      personInNeedId: PIN_USER_ID,
      location: VICTIM,
      incidentType: 'MEDICAL',
    });

    // 2) System assigns 5 helpers.
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

    // 3) Helper decisions.
    await store.markHelperAccepted({
      incidentId,
      helperId: 'helper_full_001',
      helperName: 'Alex R',
      ts: new Date(startedAt.getTime() + TICK_MS),
    });

    await store.markHelperDeclined({
      incidentId,
      helperId: 'helper_full_002',
      ts: new Date(startedAt.getTime() + 7 * TICK_MS),
    });

    await store.markHelperDeclined({
      incidentId,
      helperId: 'helper_full_003',
      ts: new Date(startedAt.getTime() + 19 * TICK_MS),
    });

    console.log(`Whole-incident simulation started. incidentId=${incidentId}`);

    // 4) Movement/telemetry loop for all helpers.
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

        if (!closeAt && helper.helperId === 'helper_full_001' && result.emittedEventTypes.includes('ARRIVED')) {
          closeAt = new Date(ts.getTime() + 5 * TICK_MS);
        }
      }

      if (closeAt && ts >= closeAt) break;
    }

    // 5) Close incident after primary helper arrival.
    await store.closeIncident({
      incidentId,
      status: 'COMPLETED',
      resolution: 'HELPER_RESOLVED',
      reason: 'PRIMARY_HELPER_REACHED_PIN',
      ts: closeAt || new Date(startedAt.getTime() + MAX_TICKS * TICK_MS),
    });

    // 6) Verification checks for regression/health.
    const stats = await store.getStats({ incidentId });
    const timeline = await store.getTimeline({ incidentId, limit: 1000 });
    const incidentDoc = await mongoose.connection.db.collection('incidents').findOne({ _id: incidentId });

    const checks = [
      {
        name: 'incident document exists',
        ok: Boolean(incidentDoc),
      },
      {
        name: 'incident closed as COMPLETED',
        ok: incidentDoc?.status === 'COMPLETED',
      },
      {
        name: '5 helpers assigned',
        ok: countEvent(timeline, 'ASSIGNED') === 5,
      },
      {
        name: 'one helper accepted',
        ok: countEvent(timeline, 'HELPER_ACCEPTED', 'helper_full_001') >= 1,
      },
      {
        name: 'decline events captured',
        ok: countEvent(timeline, 'HELPER_DECLINED') >= 2,
      },
      {
        name: 'movement tracks stored',
        ok: stats.trackCount > 0,
      },
      {
        name: 'ETA milestones captured',
        ok: countEvent(timeline, 'ETA_500M') >= 1 && countEvent(timeline, 'ETA_400M') >= 1,
      },
      {
        name: 'stop/no-movement behavior captured',
        ok: countEvent(timeline, 'STOP_STARTED') >= 1 && countEvent(timeline, 'NO_MOVEMENT_30S') >= 1,
      },
      {
        name: 'incident closed event recorded',
        ok: countEvent(timeline, 'INCIDENT_CLOSED') === 1,
      },
    ];

    const failed = checks.filter((c) => !c.ok);

    console.log('\nStored output summary');
    console.log(`incidentId: ${incidentId}`);
    console.log(`incidents status: ${incidentDoc?.status ?? 'N/A'}`);
    console.log(`incident_events count: ${stats.eventCount}`);
    console.log(`incident_helper_tracks_ts count: ${stats.trackCount}`);
    console.log('event type breakdown:');
    Object.keys(stats.eventTypes)
      .sort()
      .forEach((eventType) => {
        console.log(`  ${eventType}: ${stats.eventTypes[eventType]}`);
      });

    console.log('\nValidation checks');
    for (const check of checks) {
      console.log(`[${check.ok ? 'PASS' : 'FAIL'}] ${check.name}`);
    }

    console.log(
      `\nInspect timeline:\nnode addons/incident-telemetry/showIncidentTimeline.js ${incidentId}`,
    );

    if (failed.length > 0) {
      console.error('\nSimulation completed with failed checks.');
      process.exitCode = 1;
      return;
    }

    console.log('\nSimulation completed with all checks passing.');
  } catch (err) {
    console.error('Whole-incident simulation failed:', err);
    process.exitCode = 1;
  } finally {
    await store.close();
  }
}

runSimulation();
