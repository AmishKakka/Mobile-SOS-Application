# Incident Telemetry: Database Structure and Runbook

This document explains:
- what is stored
- where it is stored
- how the incident flow works
- how to run and verify scripts

All content here is additive and designed for the telemetry add-on under `backend/addons/incident-telemetry`.

---

## 1) Database and Collections

Database name:
- `mobile_sos`

Collections used:
1. `incidents` (summary state, one document per incident)
2. `incident_events` (timeline/rule events, many documents per incident)
3. `incident_helper_tracks_ts` (raw helper movement pings, time-series)

### 1.1 `incidents` (summary)

Purpose:
- Current state of an SOS incident and helper statuses.

Key fields:
- `_id`: incident id
- `personInNeedId`: PIN user id
- `status`: `OPEN | MATCHING | IN_PROGRESS | COMPLETED | CANCELLED | ESCALATED`
- `startedAt`, `endedAt`
- `resolution`
- `locationSnapshot`: victim snapshot (`h3Cell`, `lat`, `lng`)
- `helpers[]`: per-helper state (`ASSIGNED`, `ACCEPTED`, `DECLINED`, `ARRIVED`, etc.)

Example:

```json
{
  "_id": "sim_whole_incident_1775253481736_1571d043",
  "personInNeedId": "pin_whole_incident_001",
  "status": "COMPLETED",
  "incidentType": "MEDICAL",
  "triggerSource": "MANUAL",
  "responseMode": "HELPERS",
  "startedAt": "2026-04-03T21:58:01.881Z",
  "endedAt": "2026-04-03T22:05:11.740Z",
  "resolution": "HELPER_RESOLVED",
  "locationSnapshot": {
    "h3Cell": "8929b6d30a7ffff",
    "lat": 33.4484,
    "lng": -112.074
  },
  "helpers": [
    { "helperId": "helper_full_001", "status": "ARRIVED" },
    { "helperId": "helper_full_002", "status": "DECLINED" },
    { "helperId": "helper_full_003", "status": "DECLINED" },
    { "helperId": "helper_full_004", "status": "ASSIGNED" },
    { "helperId": "helper_full_005", "status": "ASSIGNED" }
  ]
}
```

### 1.2 `incident_events` (timeline)

Purpose:
- Human-readable event history and rule outputs.

Core event types:
- `INCIDENT_CREATED`
- `ASSIGNED`
- `HELPER_ACCEPTED`
- `HELPER_DECLINED`
- `ETA_500M`
- `ETA_400M`
- `STOP_STARTED`
- `NO_MOVEMENT_30S`
- `STOP_ENDED`
- `ARRIVED`
- `INCIDENT_CLOSED`

Example:

```json
{
  "_id": "90fc45d7-4ddf-4232-a619-0a8f534f421f",
  "incidentId": "sim_whole_incident_1775253481736_1571d043",
  "helperId": "helper_full_001",
  "eventType": "ETA_500M",
  "ts": "2026-04-03T22:02:16.740Z",
  "location": { "lat": 33.44860, "lng": -112.07923 },
  "details": { "distanceToPinM": 485.98 },
  "severity": "INFO",
  "ruleVersion": "v1"
}
```

### 1.3 `incident_helper_tracks_ts` (raw pings)

Purpose:
- High-frequency helper movement traces for forensics and replay.

Type:
- MongoDB time-series collection

Retention:
- TTL `30 days` on raw pings

Example:

```json
{
  "ts": "2026-04-03T22:02:16.740Z",
  "meta": {
    "incidentId": "sim_whole_incident_1775253481736_1571d043",
    "helperId": "helper_full_001"
  },
  "lat": 33.44860,
  "lng": -112.07923,
  "distanceToPinM": 485.98,
  "speedMps": 3.17
}
```

---

## 2) How It Works (Flow)

1. PIN triggers SOS
- Incident summary document is created in `incidents`.
- `INCIDENT_CREATED` is inserted into `incident_events`.

2. Helpers are assigned
- `helpers[]` is updated in `incidents`.
- One `ASSIGNED` event per helper is written.

3. Helper decisions
- Accept/decline updates helper status in `incidents`.
- `HELPER_ACCEPTED` and `HELPER_DECLINED` are written to `incident_events`.

4. Movement ingestion
- Each helper location ping goes to `incident_helper_tracks_ts`.
- Rule engine emits derived events into `incident_events`.

5. Rule signals
- Distance milestones: `ETA_500M`, `ETA_400M`
- Stop detection: `STOP_STARTED`, `STOP_ENDED`
- Prolonged no movement: `NO_MOVEMENT_30S`
- Arrival: `ARRIVED`

6. Incident closure
- `incidents.status` is updated (`COMPLETED`/`CANCELLED`).
- `INCIDENT_CLOSED` written in `incident_events`.

---

## 3) Rule Logic (Current v1)

Distance rules:
- emit `ETA_500M` when helper first crosses <= 500m
- emit `ETA_400M` when helper first crosses <= 400m

Stop behavior:
- `STOP_STARTED`: helper stays within 15m radius for >= 20s
- `NO_MOVEMENT_30S`: active stop duration reaches >= 30s
- `STOP_ENDED`: helper exits stop radius (>20m) for >= 10s

Arrival:
- `ARRIVED` when helper distance to PIN <= 20m

---

## 4) Scripts and How To Run

From repo root:

```bash
docker compose -f backend/addons/incident-telemetry/docker-compose.mongo.yml up -d
```

From `backend/`:

```bash
npm install
node addons/incident-telemetry/bootstrapTelemetryCollections.js
```

Simulation scripts:

1. One-direction simulation:
```bash
node addons/incident-telemetry/simulateOneDirectionHelpers.js
```

2. Full incident simulation (1 PIN + 5 helpers + checks):
```bash
node addons/incident-telemetry/simulateWholeIncident.js
```

Inspect timeline:
```bash
node addons/incident-telemetry/showIncidentTimeline.js <incidentId> 80
```

Stop MongoDB:
```bash
docker compose -f backend/addons/incident-telemetry/docker-compose.mongo.yml down
```

---

## 5) Compass (GUI) Steps

Use URI:

```text
mongodb://127.0.0.1:27017/mobile_sos?directConnection=true
```

Open collections:
- `incident_events`
- `incident_helper_tracks_ts`
- `incidents`

Useful filters:

```javascript
// incident_events
{ incidentId: "sim_whole_incident_1775253481736_1571d043" }

// incident_helper_tracks_ts
{ "meta.incidentId": "sim_whole_incident_1775253481736_1571d043" }

// incidents
{ _id: "sim_whole_incident_1775253481736_1571d043" }
```

---

## 6) Verification Checklist

After `simulateWholeIncident.js`, verify:
1. `incidents` has exactly one summary doc for incident id.
2. `incident_events` contains lifecycle + rule events.
3. `incident_helper_tracks_ts` has multiple movement pings.
4. Incident status ends in `COMPLETED`.
5. At least one `ETA_500M`, one `ETA_400M`, and one `INCIDENT_CLOSED`.

---

## 7) Troubleshooting

If Compass shows:
- `It looks like you are trying to access MongoDB over HTTP on the native driver port.`

Do this:
1. Do not use `http://localhost:27017`
2. Use Mongo URI format in Compass:
   - `mongodb://127.0.0.1:27017/mobile_sos?directConnection=true`
3. Keep auth `None` and TLS `Off` unless you configured otherwise.
