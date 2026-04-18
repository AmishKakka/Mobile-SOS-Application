# Run Mongo + One-Direction Helper Simulation

All steps are additive and do not require editing production files.

## 1) Start MongoDB with Docker Compose

From repo root:

```bash
docker compose -f backend/addons/incident-telemetry/docker-compose.mongo.yml up -d
```

Verify:

```bash
docker compose -f backend/addons/incident-telemetry/docker-compose.mongo.yml ps
```

## 2) Install backend dependencies

From `backend/`:

```bash
npm install
```

## 3) Bootstrap telemetry collections

From `backend/`:

```bash
node addons/incident-telemetry/bootstrapTelemetryCollections.js
```

This initializes:
- `incidents`
- `incident_events`
- `incident_helper_tracks_ts`

## 4) Run one-direction simulation

From `backend/`:

```bash
node addons/incident-telemetry/simulateOneDirectionHelpers.js
```

The script simulates 5 helpers coming from one direction (west -> east) toward the victim and stores:
- summary state in `incidents`
- timeline rules/events in `incident_events`
- movement pings in `incident_helper_tracks_ts`

## 5) Print timeline

Use the incident id printed by simulation:

```bash
node addons/incident-telemetry/showIncidentTimeline.js <incidentId>
```

## 6) Stop MongoDB when done

```bash
docker compose -f backend/addons/incident-telemetry/docker-compose.mongo.yml down
```
