try {
  require('dotenv').config();
} catch (_err) {
  // Optional in case dotenv is not installed in this environment yet.
}

const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const h3 = require('h3-js');

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/mobile_sos';
const H3_RESOLUTION = 9;

const RULES = {
  ETA_500M: 500,
  ETA_400M: 400,
  ARRIVAL_M: 20,
  STOP_RADIUS_M: 15,
  STOP_MIN_SEC: 20,
  STOP_EXIT_RADIUS_M: 20,
  STOP_EXIT_MIN_SEC: 10,
  NO_MOVEMENT_ALERT_SEC: 30,
};

const incidentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    personInNeedId: { type: String, required: true },
    incidentType: {
      type: String,
      enum: ['MEDICAL', 'CRIME', 'FIRE', 'ACCIDENT', 'OTHER'],
      default: 'OTHER',
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'MATCHING', 'ESCALATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'OPEN',
      required: true,
    },
    triggerSource: {
      type: String,
      enum: ['BUTTON', 'VOICE', 'AUTO_DETECTION', 'MANUAL'],
      default: 'MANUAL',
      required: true,
    },
    responseMode: {
      type: String,
      enum: ['HELPERS', 'POLICE', 'AMBULANCE', 'CONTACTS_ONLY', 'MIXED'],
      default: 'HELPERS',
      required: true,
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    resolution: {
      type: String,
      enum: [
        'HELPER_RESOLVED',
        'POLICE_HANDLED',
        'AMBULANCE_HANDLED',
        'CONTACTS_HANDLED',
        'FALSE_ALARM',
        'CANCELLED',
        'EXTERNALLY_HANDLED',
        null,
      ],
      default: null,
    },
    locationSnapshot: {
      h3Cell: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    helpers: {
      type: [
        {
          helperId: { type: String, required: true },
          helperName: { type: String, default: null },
          status: {
            type: String,
            enum: ['ASSIGNED', 'ACCEPTED', 'DECLINED', 'ARRIVED', 'CANCELLED', 'NO_RESPONSE'],
            required: true,
          },
          assignedAt: { type: Date, default: null },
          respondedAt: { type: Date, default: null },
          arrivedAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
    emergencyContactsNotified: { type: [String], default: [] },
  },
  {
    strict: true,
    collection: 'incidents',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

const incidentEventSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    incidentId: { type: String, required: true, index: true },
    helperId: { type: String, default: null, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'INCIDENT_CREATED',
        'ASSIGNED',
        'HELPER_ACCEPTED',
        'HELPER_DECLINED',
        'ETA_500M',
        'ETA_400M',
        'STOP_STARTED',
        'STOP_ENDED',
        'NO_MOVEMENT_30S',
        'ARRIVED',
        'INCIDENT_CLOSED',
      ],
    },
    ts: { type: Date, required: true, default: Date.now, index: true },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    severity: { type: String, enum: ['INFO', 'MEDIUM', 'HIGH'], default: 'INFO' },
    ruleVersion: { type: String, default: 'v1' },
  },
  {
    strict: true,
    collection: 'incident_events',
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
);

incidentEventSchema.index({ incidentId: 1, ts: 1 });
incidentEventSchema.index({ incidentId: 1, helperId: 1, ts: 1 });

const incidentHelperTrackSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true, default: Date.now },
    meta: {
      incidentId: { type: String, required: true },
      helperId: { type: String, required: true },
    },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    distanceToPinM: { type: Number, default: null },
    speedMps: { type: Number, default: null },
  },
  {
    strict: true,
    collection: 'incident_helper_tracks_ts',
    timeseries: {
      timeField: 'ts',
      metaField: 'meta',
      granularity: 'seconds',
    },
    expireAfterSeconds: 60 * 60 * 24 * 30,
  },
);

incidentHelperTrackSchema.index({ 'meta.incidentId': 1, 'meta.helperId': 1, ts: 1 });

const Incident = mongoose.models.AddonIncident || mongoose.model('AddonIncident', incidentSchema);
const IncidentEvent =
  mongoose.models.AddonIncidentEvent || mongoose.model('AddonIncidentEvent', incidentEventSchema);
const IncidentHelperTrack =
  mongoose.models.AddonIncidentHelperTrack ||
  mongoose.model('AddonIncidentHelperTrack', incidentHelperTrackSchema);

function normalizeLocation(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng ?? location?.long);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new TypeError('Location must include numeric lat and lng/long.');
  }
  return { lat, lng };
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function elapsedSeconds(startAt, endAt) {
  return Math.max(0, (endAt.getTime() - startAt.getTime()) / 1000);
}

function createHelperRuntimeState() {
  return {
    crossed500m: false,
    crossed400m: false,
    arrived: false,
    lastPoint: null,
    stopCandidateStartAt: null,
    stopAnchor: null,
    activeStop: null,
    stopExitCandidateAt: null,
  };
}

class TelemetryStore {
  constructor(options = {}) {
    this.mongoUri = options.mongoUri || process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
    this.ruleVersion = options.ruleVersion || 'v1';
    this.stateByIncident = new Map();
  }

  async connect() {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(this.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
  }

  async initialize() {
    await this.connect();
    await Promise.all([Incident.init(), IncidentEvent.init()]);
    try {
      await IncidentHelperTrack.createCollection();
    } catch (err) {
      if (err?.codeName !== 'NamespaceExists' && err?.code !== 48) throw err;
    }
    await IncidentHelperTrack.init();
  }

  async close() {
    this.stateByIncident.clear();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  async createIncident({ incidentId, personInNeedId, location, incidentType = 'OTHER' }) {
    const victimLocation = normalizeLocation(location);
    const now = new Date();
    const h3Cell = h3.latLngToCell(victimLocation.lat, victimLocation.lng, H3_RESOLUTION);

    await Incident.updateOne(
      { _id: incidentId },
      {
        $setOnInsert: {
          _id: incidentId,
          personInNeedId,
          incidentType,
          status: 'OPEN',
          triggerSource: 'MANUAL',
          responseMode: 'HELPERS',
          startedAt: now,
          endedAt: null,
          resolution: null,
          locationSnapshot: {
            h3Cell,
            lat: victimLocation.lat,
            lng: victimLocation.lng,
          },
          helpers: [],
          emergencyContactsNotified: [],
        },
      },
      { upsert: true },
    );

    this.stateByIncident.set(incidentId, {
      victimLocation,
      helperStateById: new Map(),
      closed: false,
    });

    await this.addEvent({
      incidentId,
      eventType: 'INCIDENT_CREATED',
      ts: now,
      location: victimLocation,
      details: { personInNeedId },
    });
  }

  async assignHelpers({ incidentId, helpers }) {
    if (!Array.isArray(helpers) || helpers.length === 0) return;
    const incident = await Incident.findById(incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    const now = new Date();
    const batchEvents = [];
    for (const helper of helpers) {
      const helperId = String(helper.userId || helper.helperId || '').trim();
      if (!helperId) continue;
      const helperName = helper.name || null;

      const existing = incident.helpers.find((row) => row.helperId === helperId);
      if (!existing) {
        incident.helpers.push({
          helperId,
          helperName,
          status: 'ASSIGNED',
          assignedAt: now,
          respondedAt: null,
          arrivedAt: null,
        });
      } else {
        existing.helperName = helperName || existing.helperName;
        existing.status = 'ASSIGNED';
        existing.assignedAt = now;
      }

      batchEvents.push({
        incidentId,
        helperId,
        eventType: 'ASSIGNED',
        ts: now,
        location: {
          lat: Number.isFinite(helper.lat) ? helper.lat : null,
          lng: Number.isFinite(helper.lng ?? helper.long) ? Number(helper.lng ?? helper.long) : null,
        },
        details: {
          helperName: helperName || helperId,
          distanceFromVictimM: Number.isFinite(helper.distance) ? helper.distance : null,
        },
        severity: 'INFO',
      });

      const incidentState = this._getOrCreateIncidentState(incidentId);
      if (!incidentState.helperStateById.has(helperId)) {
        incidentState.helperStateById.set(helperId, createHelperRuntimeState());
      }
    }

    if (incident.status === 'OPEN') incident.status = 'MATCHING';
    await incident.save();

    if (batchEvents.length > 0) {
      await IncidentEvent.insertMany(
        batchEvents.map((event) => ({
          ...event,
          ruleVersion: this.ruleVersion,
        })),
      );
    }
  }

  async markHelperAccepted({ incidentId, helperId, helperName = null, ts = new Date() }) {
    const incident = await Incident.findById(incidentId);
    if (!incident) return;

    const helper = incident.helpers.find((row) => row.helperId === helperId);
    if (helper) {
      helper.status = 'ACCEPTED';
      helper.respondedAt = ts;
      helper.helperName = helperName || helper.helperName;
    } else {
      incident.helpers.push({
        helperId,
        helperName,
        status: 'ACCEPTED',
        assignedAt: null,
        respondedAt: ts,
        arrivedAt: null,
      });
    }

    if (incident.status !== 'COMPLETED' && incident.status !== 'CANCELLED') {
      incident.status = 'IN_PROGRESS';
    }
    await incident.save();

    await this.addEvent({
      incidentId,
      helperId,
      eventType: 'HELPER_ACCEPTED',
      ts,
      details: { helperName: helperName || helperId },
    });
  }

  async markHelperDeclined({ incidentId, helperId, ts = new Date() }) {
    const incident = await Incident.findById(incidentId);
    if (!incident) return;

    const helper = incident.helpers.find((row) => row.helperId === helperId);
    if (helper) {
      helper.status = 'DECLINED';
      helper.respondedAt = ts;
      await incident.save();
    }

    await this.addEvent({
      incidentId,
      helperId,
      eventType: 'HELPER_DECLINED',
      ts,
      details: {},
    });
  }

  async addEvent({
    incidentId,
    helperId = null,
    eventType,
    ts = new Date(),
    location = null,
    details = {},
    severity = 'INFO',
  }) {
    const safeLocation = location
      ? { lat: Number(location.lat), lng: Number(location.lng ?? location.long) }
      : { lat: null, lng: null };

    await IncidentEvent.create({
      incidentId,
      helperId,
      eventType,
      ts,
      location: safeLocation,
      details,
      severity,
      ruleVersion: this.ruleVersion,
    });
  }

  async recordHelperPing({ incidentId, helperId, location, ts = new Date() }) {
    const loc = normalizeLocation(location);
    const incidentState = await this._ensureIncidentState(incidentId);
    const helperState = this._getOrCreateHelperState(incidentState, helperId);

    const victimLoc = incidentState.victimLocation;
    const distanceToPinM = haversineMeters(loc.lat, loc.lng, victimLoc.lat, victimLoc.lng);
    const speedMps = this._deriveSpeedMps(helperState.lastPoint, loc, ts);

    await IncidentHelperTrack.create({
      ts,
      meta: { incidentId, helperId },
      lat: loc.lat,
      lng: loc.lng,
      distanceToPinM,
      speedMps,
    });

    const emittedEvents = [];
    this._applyDistanceMilestones({
      helperState,
      incidentId,
      helperId,
      ts,
      loc,
      distanceToPinM,
      emittedEvents,
    });
    this._applyStopLogic({
      helperState,
      incidentId,
      helperId,
      ts,
      loc,
      distanceToPinM,
      emittedEvents,
    });

    if (!helperState.arrived && distanceToPinM <= RULES.ARRIVAL_M) {
      helperState.arrived = true;
      emittedEvents.push({
        incidentId,
        helperId,
        eventType: 'ARRIVED',
        ts,
        location: loc,
        details: { distanceToPinM: Number(distanceToPinM.toFixed(2)) },
        severity: 'INFO',
      });
      await this._setHelperArrived(incidentId, helperId, ts);
    }

    if (emittedEvents.length > 0) {
      await IncidentEvent.insertMany(
        emittedEvents.map((event) => ({
          ...event,
          location: { lat: event.location.lat, lng: event.location.lng },
          ruleVersion: this.ruleVersion,
        })),
      );
    }

    helperState.lastPoint = {
      lat: loc.lat,
      lng: loc.lng,
      ts,
      speedMps,
      distanceToPinM,
    };

    return {
      distanceToPinM: Number(distanceToPinM.toFixed(2)),
      emittedEventTypes: emittedEvents.map((event) => event.eventType),
    };
  }

  async closeIncident({
    incidentId,
    status = 'COMPLETED',
    resolution = 'HELPER_RESOLVED',
    reason = 'CLOSED_BY_WORKFLOW',
    ts = new Date(),
  }) {
    const incident = await Incident.findById(incidentId);
    if (!incident) return;

    if (incident.status === 'COMPLETED' || incident.status === 'CANCELLED') return;

    incident.status = status;
    incident.resolution = resolution;
    incident.endedAt = ts;
    await incident.save();

    await this.addEvent({
      incidentId,
      eventType: 'INCIDENT_CLOSED',
      ts,
      location: incident.locationSnapshot,
      details: { finalStatus: status, resolution, reason },
    });

    const state = this.stateByIncident.get(incidentId);
    if (state) state.closed = true;
  }

  async getTimeline({ incidentId, limit = 200 }) {
    return IncidentEvent.find({ incidentId }).sort({ ts: 1 }).limit(limit).lean();
  }

  async getStats({ incidentId }) {
    const [eventCount, trackCount, grouped] = await Promise.all([
      IncidentEvent.countDocuments({ incidentId }),
      IncidentHelperTrack.countDocuments({ 'meta.incidentId': incidentId }),
      IncidentEvent.aggregate([
        { $match: { incidentId } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      eventCount,
      trackCount,
      eventTypes: grouped.reduce((acc, row) => {
        acc[row._id] = row.count;
        return acc;
      }, {}),
    };
  }

  _deriveSpeedMps(lastPoint, loc, ts) {
    if (!lastPoint) return null;
    const dt = elapsedSeconds(lastPoint.ts, ts);
    if (dt <= 0) return lastPoint.speedMps ?? null;
    const moved = haversineMeters(lastPoint.lat, lastPoint.lng, loc.lat, loc.lng);
    return Number((moved / dt).toFixed(3));
  }

  _getOrCreateIncidentState(incidentId) {
    let state = this.stateByIncident.get(incidentId);
    if (!state) {
      state = {
        victimLocation: null,
        helperStateById: new Map(),
        closed: false,
      };
      this.stateByIncident.set(incidentId, state);
    }
    return state;
  }

  async _ensureIncidentState(incidentId) {
    const state = this._getOrCreateIncidentState(incidentId);
    if (state.victimLocation) return state;

    const incident = await Incident.findById(incidentId).lean();
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);

    state.victimLocation = {
      lat: Number(incident.locationSnapshot.lat),
      lng: Number(incident.locationSnapshot.lng),
    };
    return state;
  }

  _getOrCreateHelperState(incidentState, helperId) {
    let state = incidentState.helperStateById.get(helperId);
    if (!state) {
      state = createHelperRuntimeState();
      incidentState.helperStateById.set(helperId, state);
    }
    return state;
  }

  _applyDistanceMilestones({
    helperState,
    incidentId,
    helperId,
    ts,
    loc,
    distanceToPinM,
    emittedEvents,
  }) {
    if (!helperState.crossed500m && distanceToPinM <= RULES.ETA_500M) {
      helperState.crossed500m = true;
      emittedEvents.push({
        incidentId,
        helperId,
        eventType: 'ETA_500M',
        ts,
        location: loc,
        details: { distanceToPinM: Number(distanceToPinM.toFixed(2)) },
        severity: 'INFO',
      });
    }

    if (!helperState.crossed400m && distanceToPinM <= RULES.ETA_400M) {
      helperState.crossed400m = true;
      emittedEvents.push({
        incidentId,
        helperId,
        eventType: 'ETA_400M',
        ts,
        location: loc,
        details: { distanceToPinM: Number(distanceToPinM.toFixed(2)) },
        severity: 'INFO',
      });
    }
  }

  _applyStopLogic({
    helperState,
    incidentId,
    helperId,
    ts,
    loc,
    distanceToPinM,
    emittedEvents,
  }) {
    if (!helperState.activeStop) {
      if (!helperState.stopCandidateStartAt || !helperState.stopAnchor) {
        helperState.stopCandidateStartAt = ts;
        helperState.stopAnchor = { lat: loc.lat, lng: loc.lng };
        return;
      }

      const drift = haversineMeters(
        helperState.stopAnchor.lat,
        helperState.stopAnchor.lng,
        loc.lat,
        loc.lng,
      );

      if (drift <= RULES.STOP_RADIUS_M) {
        const dwell = elapsedSeconds(helperState.stopCandidateStartAt, ts);
        if (dwell >= RULES.STOP_MIN_SEC) {
          helperState.activeStop = {
            startAt: helperState.stopCandidateStartAt,
            anchorLat: helperState.stopAnchor.lat,
            anchorLng: helperState.stopAnchor.lng,
            startDistanceToPinM: distanceToPinM,
            noMovementLogged: false,
          };
          helperState.stopCandidateStartAt = null;
          helperState.stopAnchor = null;
          helperState.stopExitCandidateAt = null;

          emittedEvents.push({
            incidentId,
            helperId,
            eventType: 'STOP_STARTED',
            ts,
            location: loc,
            details: {
              startAt: helperState.activeStop.startAt,
              anchorLat: Number(helperState.activeStop.anchorLat.toFixed(6)),
              anchorLng: Number(helperState.activeStop.anchorLng.toFixed(6)),
              distanceToPinM: Number(distanceToPinM.toFixed(2)),
              radiusM: RULES.STOP_RADIUS_M,
              minDurationSec: RULES.STOP_MIN_SEC,
            },
            severity: 'INFO',
          });
        }
      } else {
        helperState.stopCandidateStartAt = ts;
        helperState.stopAnchor = { lat: loc.lat, lng: loc.lng };
      }

      return;
    }

    const activeStop = helperState.activeStop;
    const durationSec = elapsedSeconds(activeStop.startAt, ts);

    if (!activeStop.noMovementLogged && durationSec >= RULES.NO_MOVEMENT_ALERT_SEC) {
      activeStop.noMovementLogged = true;
      emittedEvents.push({
        incidentId,
        helperId,
        eventType: 'NO_MOVEMENT_30S',
        ts,
        location: loc,
        details: {
          stopStartedAt: activeStop.startAt,
          durationSec: Number(durationSec.toFixed(1)),
          distanceToPinM: Number(distanceToPinM.toFixed(2)),
        },
        severity: 'MEDIUM',
      });
    }

    const drift = haversineMeters(activeStop.anchorLat, activeStop.anchorLng, loc.lat, loc.lng);
    if (drift > RULES.STOP_EXIT_RADIUS_M) {
      if (!helperState.stopExitCandidateAt) {
        helperState.stopExitCandidateAt = ts;
        return;
      }

      const exitSec = elapsedSeconds(helperState.stopExitCandidateAt, ts);
      if (exitSec >= RULES.STOP_EXIT_MIN_SEC) {
        emittedEvents.push({
          incidentId,
          helperId,
          eventType: 'STOP_ENDED',
          ts,
          location: loc,
          details: {
            startAt: activeStop.startAt,
            endAt: ts,
            durationSec: Number(durationSec.toFixed(1)),
            anchorLat: Number(activeStop.anchorLat.toFixed(6)),
            anchorLng: Number(activeStop.anchorLng.toFixed(6)),
            startDistanceToPinM: Number(activeStop.startDistanceToPinM.toFixed(2)),
            endDistanceToPinM: Number(distanceToPinM.toFixed(2)),
          },
          severity: 'INFO',
        });

        helperState.activeStop = null;
        helperState.stopExitCandidateAt = null;
        helperState.stopCandidateStartAt = ts;
        helperState.stopAnchor = { lat: loc.lat, lng: loc.lng };
      }
    } else {
      helperState.stopExitCandidateAt = null;
    }
  }

  async _setHelperArrived(incidentId, helperId, arrivedAt) {
    const incident = await Incident.findById(incidentId);
    if (!incident) return;

    const helper = incident.helpers.find((row) => row.helperId === helperId);
    if (helper) {
      helper.status = 'ARRIVED';
      helper.arrivedAt = arrivedAt;
    } else {
      incident.helpers.push({
        helperId,
        helperName: null,
        status: 'ARRIVED',
        assignedAt: null,
        respondedAt: null,
        arrivedAt,
      });
    }

    if (incident.status !== 'COMPLETED' && incident.status !== 'CANCELLED') {
      incident.status = 'IN_PROGRESS';
    }
    await incident.save();
  }
}

module.exports = {
  RULES,
  TelemetryStore,
  haversineMeters,
};
