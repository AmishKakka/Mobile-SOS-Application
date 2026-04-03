#!/usr/bin/env node
const { TelemetryStore } = require('./telemetryStore');

async function main() {
  const store = new TelemetryStore();
  try {
    await store.initialize();
    console.log('Telemetry collections initialized: incidents, incident_events, incident_helper_tracks_ts');
  } catch (err) {
    console.error('Failed to bootstrap telemetry collections:', err);
    process.exitCode = 1;
  } finally {
    await store.close();
  }
}

main();
