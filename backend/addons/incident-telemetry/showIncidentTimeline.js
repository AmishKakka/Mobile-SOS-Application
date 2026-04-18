#!/usr/bin/env node
const { TelemetryStore } = require('./telemetryStore');

async function main() {
  const incidentId = process.argv[2];
  const limitArg = Number(process.argv[3]);
  const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : 200;

  if (!incidentId) {
    console.error('Usage: node addons/incident-telemetry/showIncidentTimeline.js <incidentId> [limit]');
    process.exit(1);
  }

  const store = new TelemetryStore();
  try {
    await store.initialize();
    const timeline = await store.getTimeline({ incidentId, limit });
    if (timeline.length === 0) {
      console.log(`No events found for incidentId=${incidentId}`);
      return;
    }

    console.log(`Timeline for incidentId=${incidentId} (events=${timeline.length})`);
    for (const ev of timeline) {
      const helperLabel = ev.helperId ? ` helper=${ev.helperId}` : '';
      const loc =
        Number.isFinite(ev.location?.lat) && Number.isFinite(ev.location?.lng)
          ? ` @(${ev.location.lat.toFixed(5)}, ${ev.location.lng.toFixed(5)})`
          : '';
      console.log(
        `${new Date(ev.ts).toISOString()} ${ev.eventType}${helperLabel}${loc} severity=${ev.severity}`,
      );
    }
  } catch (err) {
    console.error('Failed to load timeline:', err);
    process.exitCode = 1;
  } finally {
    await store.close();
  }
}

main();
