# Incident Telemetry Add-on (Additive Only)

This module is fully additive and does not change existing production files.

It adds an optional logging layer for:
- `incidents` (summary state)
- `incident_events` (timeline + rule events)
- `incident_helper_tracks_ts` (raw location pings, time-series + TTL)

## Files
- `telemetryStore.js`: reusable incident telemetry engine
- `bootstrapTelemetryCollections.js`: creates/initializes required collections/indexes
- `simulateFiveHelpers.js`: runs a 5-helper simulation and stores data in MongoDB
- `showIncidentTimeline.js`: prints a timeline for one incident

## Environment
- `MONGODB_URI` (optional)
  - default: `mongodb://127.0.0.1:27017/mobile_sos`

## Run
From `backend/`:

```bash
node addons/incident-telemetry/bootstrapTelemetryCollections.js
node addons/incident-telemetry/simulateFiveHelpers.js
node addons/incident-telemetry/showIncidentTimeline.js <incidentId>
```

## Notes
- Stop policy is two-layer:
  - Behavior logging at `15m radius + 20s`
  - `NO_MOVEMENT_30S` event while stopped
- `incident_helper_tracks_ts` keeps raw pings for 30 days (TTL).
