const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const TRACK_TTL_SECONDS = 60 * 60 * 24 * 30;

const RULES = {
  ARRIVAL_M: Number(process.env.TELEMETRY_ARRIVAL_METERS || 20),
  SAMPLE_DISTANCE_M: Number(process.env.TELEMETRY_SAMPLE_DISTANCE_METERS || 25),
  SAMPLE_INTERVAL_SEC: Number(process.env.TELEMETRY_SAMPLE_INTERVAL_SECONDS || 15),
  GAP_SEC: Number(process.env.TELEMETRY_GAP_SECONDS || 45),
  STOP_RADIUS_M: Number(process.env.TELEMETRY_STOP_RADIUS_METERS || 15),
  STOP_MIN_SEC: Number(process.env.TELEMETRY_STOP_MIN_SECONDS || 20),
  STOP_EXIT_RADIUS_M: Number(process.env.TELEMETRY_STOP_EXIT_RADIUS_METERS || 20),
  STOP_EXIT_MIN_SEC: Number(process.env.TELEMETRY_STOP_EXIT_MIN_SECONDS || 10),
  STOP_HEARTBEAT_SEC: Number(process.env.TELEMETRY_STOP_HEARTBEAT_SECONDS || 60),
  STOP_PROLONGED_SEC: Number(process.env.TELEMETRY_STOP_PROLONGED_SECONDS || 60),
};

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
        'HELPER_ASSIGNED',
        'HELPER_ACCEPTED',
        'HELPER_DECLINED',
        'HELPER_CANCELLED',
        'STOP_STARTED',
        'STOP_PROLONGED',
        'STOP_ENDED',
        'ARRIVED',
        'LOCATION_GAP',
        'TRACKING_RESUMED',
        'INCIDENT_CANCELLED',
        'INCIDENT_COMPLETED',
      ],
    },
    ts: { type: Date, required: true, default: Date.now, index: true },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    severity: { type: String, enum: ['INFO', 'MEDIUM', 'HIGH'], default: 'INFO' },
    ruleVersion: { type: String, default: 'v1-minimal' },
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
    distanceToVictimM: { type: Number, default: null },
    speedMps: { type: Number, default: null },
    sampleReason: {
      type: String,
      enum: [
        'initial',
        'movement',
        'interval',
        'gap_resume',
        'stop_start',
        'stop_heartbeat',
        'stop_end',
        'arrival',
      ],
      required: true,
    },
  },
  {
    strict: true,
    collection: 'incident_helper_tracks_ts',
    timeseries: {
      timeField: 'ts',
      metaField: 'meta',
      granularity: 'seconds',
    },
    expireAfterSeconds: TRACK_TTL_SECONDS,
  },
);

incidentHelperTrackSchema.index({ 'meta.incidentId': 1, 'meta.helperId': 1, ts: 1 });

const IncidentEvent =
  mongoose.models.IncidentEvent || mongoose.model('IncidentEvent', incidentEventSchema);
const IncidentHelperTrack =
  mongoose.models.IncidentHelperTrack ||
  mongoose.model('IncidentHelperTrack', incidentHelperTrackSchema);

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

function normalizeLocation(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng ?? location?.long);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new TypeError('Location must include numeric lat and lng.');
  }
  return { lat, lng };
}

function createHelperRuntimeState() {
  return {
    lastPing: null,
    lastStoredTrack: null,
    arrived: false,
    gapOpen: false,
    stopCandidateStartAt: null,
    stopAnchor: null,
    activeStop: null,
    stopExitCandidateAt: null,
  };
}

class IncidentTelemetryStore {
  constructor() {
    this.stateByIncident = new Map();
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      await IncidentEvent.init();
      try {
        await IncidentHelperTrack.createCollection();
      } catch (error) {
        if (error?.codeName !== 'NamespaceExists' && error?.code !== 48) {
          throw error;
        }
      }
      await IncidentHelperTrack.init();
    })();

    return this.initPromise;
  }

  clearIncident(incidentId) {
    this.stateByIncident.delete(String(incidentId || ''));
  }

  async logIncidentCreated({ incidentId, roomId, victimUserId, location, ts = new Date() }) {
    const victimLocation = normalizeLocation(location);
    this._ensureIncidentState(incidentId, victimLocation);
    await this._addEvent({
      incidentId,
      eventType: 'INCIDENT_CREATED',
      ts,
      location: victimLocation,
      details: { roomId, victimUserId },
    });
  }

  async logHelpersAssigned({ incidentId, roomId, victimLocation, helpers = [], ts = new Date() }) {
    const safeVictimLocation = victimLocation ? normalizeLocation(victimLocation) : null;
    if (safeVictimLocation) {
      this._ensureIncidentState(incidentId, safeVictimLocation);
    }

    const rows = helpers
      .map((helper) => {
        const helperId = String(helper.userId || helper.helperId || '').trim();
        if (!helperId) return null;
        return {
          incidentId,
          helperId,
          eventType: 'HELPER_ASSIGNED',
          ts,
          location: null,
          details: {
            roomId,
            helperName: helper.name || helperId,
            helperDistanceMeters: Number.isFinite(Number(helper.distance))
              ? Number(helper.distance)
              : null,
          },
          severity: 'INFO',
          ruleVersion: 'v1-minimal',
        };
      })
      .filter(Boolean);

    if (rows.length > 0) {
      await IncidentEvent.insertMany(rows);
    }
  }

  async logHelperAccepted({ incidentId, helperId, helperName, roomId, ts = new Date() }) {
    await this._addEvent({
      incidentId,
      helperId,
      eventType: 'HELPER_ACCEPTED',
      ts,
      details: { roomId, helperName: helperName || helperId },
    });
  }

  async logHelperDeclined({ incidentId, helperId, roomId, ts = new Date() }) {
    await this._addEvent({
      incidentId,
      helperId,
      eventType: 'HELPER_DECLINED',
      ts,
      details: { roomId },
    });
  }

  async logHelperCancelled({ incidentId, helperId, roomId, reason, ts = new Date() }) {
    await this._addEvent({
      incidentId,
      helperId,
      eventType: 'HELPER_CANCELLED',
      ts,
      details: { roomId, reason: reason || 'cancelled' },
      severity: 'MEDIUM',
    });
  }

  async logIncidentClosed({
    incidentId,
    roomId,
    finalStatus,
    helperId = null,
    reason = null,
    notes = null,
    ts = new Date(),
  }) {
    const eventType = finalStatus === 'COMPLETED' ? 'INCIDENT_COMPLETED' : 'INCIDENT_CANCELLED';
    await this._addEvent({
      incidentId,
      helperId,
      eventType,
      ts,
      details: { roomId, finalStatus, reason, notes },
      severity: finalStatus === 'COMPLETED' ? 'INFO' : 'MEDIUM',
    });
    this.clearIncident(incidentId);
  }

  async recordHelperMovement({
    incidentId,
    helperId,
    location,
    victimLocation,
    ts = new Date(),
  }) {
    const loc = normalizeLocation(location);
    const state = this._ensureIncidentState(incidentId, victimLocation);
    const helperState = this._getOrCreateHelperState(state, helperId);
    const events = [];
    const tracks = [];

    const victimLoc = state.victimLocation ? normalizeLocation(state.victimLocation) : null;
    const distanceToVictimM = victimLoc
      ? haversineMeters(loc.lat, loc.lng, victimLoc.lat, victimLoc.lng)
      : null;
    const speedMps = this._deriveSpeedMps(helperState.lastPing, loc, ts);

    if (helperState.lastPing) {
      const gapSec = elapsedSeconds(helperState.lastPing.ts, ts);
      if (gapSec >= RULES.GAP_SEC) {
        helperState.gapOpen = true;
        events.push(this._buildEvent({
          incidentId,
          helperId,
          eventType: 'LOCATION_GAP',
          ts,
          location: loc,
          details: { gapSec: Number(gapSec.toFixed(1)) },
          severity: 'MEDIUM',
        }));
        events.push(this._buildEvent({
          incidentId,
          helperId,
          eventType: 'TRACKING_RESUMED',
          ts,
          location: loc,
          details: { gapSec: Number(gapSec.toFixed(1)) },
          severity: 'INFO',
        }));
        tracks.push(this._buildTrack({
          incidentId,
          helperId,
          ts,
          location: loc,
          distanceToVictimM,
          speedMps,
          sampleReason: 'gap_resume',
        }));
      }
    }

    this._applyStopLogic({
      helperState,
      incidentId,
      helperId,
      ts,
      loc,
      distanceToVictimM,
      events,
      tracks,
      speedMps,
    });

    if (!helperState.arrived && distanceToVictimM !== null && distanceToVictimM <= RULES.ARRIVAL_M) {
      helperState.arrived = true;
      events.push(this._buildEvent({
        incidentId,
        helperId,
        eventType: 'ARRIVED',
        ts,
        location: loc,
        details: { distanceToVictimM: Number(distanceToVictimM.toFixed(2)) },
        severity: 'INFO',
      }));
      tracks.push(this._buildTrack({
        incidentId,
        helperId,
        ts,
        location: loc,
        distanceToVictimM,
        speedMps,
        sampleReason: 'arrival',
      }));
    }

    if (tracks.length === 0) {
      const sampledTrack = this._maybeSampleTrack({
        helperState,
        incidentId,
        helperId,
        ts,
        loc,
        distanceToVictimM,
        speedMps,
      });
      if (sampledTrack) {
        tracks.push(sampledTrack);
      }
    }

    if (events.length > 0) {
      await IncidentEvent.insertMany(events);
    }
    if (tracks.length > 0) {
      await IncidentHelperTrack.insertMany(tracks);
      helperState.lastStoredTrack = tracks[tracks.length - 1];
    }

    helperState.lastPing = {
      lat: loc.lat,
      lng: loc.lng,
      ts,
      speedMps,
      distanceToVictimM,
    };

    return {
      eventTypes: events.map((event) => event.eventType),
      trackSamples: tracks.length,
      distanceToVictimM: distanceToVictimM === null ? null : Number(distanceToVictimM.toFixed(2)),
    };
  }

  _ensureIncidentState(incidentId, victimLocation = null) {
    const safeIncidentId = String(incidentId || '').trim();
    if (!safeIncidentId) {
      throw new Error('incidentId is required for telemetry.');
    }

    let state = this.stateByIncident.get(safeIncidentId);
    if (!state) {
      state = {
        victimLocation: victimLocation ? normalizeLocation(victimLocation) : null,
        helperStateById: new Map(),
      };
      this.stateByIncident.set(safeIncidentId, state);
    } else if (victimLocation) {
      state.victimLocation = normalizeLocation(victimLocation);
    }

    return state;
  }

  _getOrCreateHelperState(incidentState, helperId) {
    const safeHelperId = String(helperId || '').trim();
    if (!safeHelperId) {
      throw new Error('helperId is required for telemetry.');
    }

    let state = incidentState.helperStateById.get(safeHelperId);
    if (!state) {
      state = createHelperRuntimeState();
      incidentState.helperStateById.set(safeHelperId, state);
    }
    return state;
  }

  _deriveSpeedMps(lastPing, loc, ts) {
    if (!lastPing) return null;
    const dt = elapsedSeconds(lastPing.ts, ts);
    if (dt <= 0) return lastPing.speedMps ?? null;
    const moved = haversineMeters(lastPing.lat, lastPing.lng, loc.lat, loc.lng);
    return Number((moved / dt).toFixed(3));
  }

  _maybeSampleTrack({ helperState, incidentId, helperId, ts, loc, distanceToVictimM, speedMps }) {
    if (!helperState.lastStoredTrack) {
      return this._buildTrack({
        incidentId,
        helperId,
        ts,
        location: loc,
        distanceToVictimM,
        speedMps,
        sampleReason: 'initial',
      });
    }

    if (helperState.activeStop) {
      const lastStoredTs = helperState.lastStoredTrack.ts || helperState.lastStoredTrack.createdAt;
      const elapsedSinceTrack = elapsedSeconds(lastStoredTs, ts);
      if (elapsedSinceTrack >= RULES.STOP_HEARTBEAT_SEC) {
        helperState.activeStop.lastHeartbeatAt = ts;
        return this._buildTrack({
          incidentId,
          helperId,
          ts,
          location: loc,
          distanceToVictimM,
          speedMps,
          sampleReason: 'stop_heartbeat',
        });
      }
      return null;
    }

    const movedSinceTrack = haversineMeters(
      helperState.lastStoredTrack.lat,
      helperState.lastStoredTrack.lng,
      loc.lat,
      loc.lng,
    );
    const elapsedSinceTrack = elapsedSeconds(helperState.lastStoredTrack.ts, ts);

    if (movedSinceTrack >= RULES.SAMPLE_DISTANCE_M) {
      return this._buildTrack({
        incidentId,
        helperId,
        ts,
        location: loc,
        distanceToVictimM,
        speedMps,
        sampleReason: 'movement',
      });
    }

    if (elapsedSinceTrack >= RULES.SAMPLE_INTERVAL_SEC) {
      return this._buildTrack({
        incidentId,
        helperId,
        ts,
        location: loc,
        distanceToVictimM,
        speedMps,
        sampleReason: 'interval',
      });
    }

    return null;
  }

  _applyStopLogic({
    helperState,
    incidentId,
    helperId,
    ts,
    loc,
    distanceToVictimM,
    events,
    tracks,
    speedMps,
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
            prolongedLogged: false,
            lastHeartbeatAt: ts,
          };
          helperState.stopCandidateStartAt = null;
          helperState.stopAnchor = null;
          helperState.stopExitCandidateAt = null;

          events.push(this._buildEvent({
            incidentId,
            helperId,
            eventType: 'STOP_STARTED',
            ts,
            location: loc,
            details: {
              durationSec: Number(dwell.toFixed(1)),
              distanceToVictimM: distanceToVictimM === null ? null : Number(distanceToVictimM.toFixed(2)),
            },
            severity: 'INFO',
          }));
          tracks.push(this._buildTrack({
            incidentId,
            helperId,
            ts,
            location: loc,
            distanceToVictimM,
            speedMps,
            sampleReason: 'stop_start',
          }));
        }
      } else {
        helperState.stopCandidateStartAt = ts;
        helperState.stopAnchor = { lat: loc.lat, lng: loc.lng };
      }

      return;
    }

    const activeStop = helperState.activeStop;
    const stopDurationSec = elapsedSeconds(activeStop.startAt, ts);

    if (!activeStop.prolongedLogged && stopDurationSec >= RULES.STOP_PROLONGED_SEC) {
      activeStop.prolongedLogged = true;
      events.push(this._buildEvent({
        incidentId,
        helperId,
        eventType: 'STOP_PROLONGED',
        ts,
        location: loc,
        details: {
          durationSec: Number(stopDurationSec.toFixed(1)),
          distanceToVictimM: distanceToVictimM === null ? null : Number(distanceToVictimM.toFixed(2)),
        },
        severity: 'MEDIUM',
      }));
    }

    const drift = haversineMeters(activeStop.anchorLat, activeStop.anchorLng, loc.lat, loc.lng);
    if (drift > RULES.STOP_EXIT_RADIUS_M) {
      if (!helperState.stopExitCandidateAt) {
        helperState.stopExitCandidateAt = ts;
        return;
      }

      const exitSec = elapsedSeconds(helperState.stopExitCandidateAt, ts);
      if (exitSec >= RULES.STOP_EXIT_MIN_SEC) {
        events.push(this._buildEvent({
          incidentId,
          helperId,
          eventType: 'STOP_ENDED',
          ts,
          location: loc,
          details: {
            durationSec: Number(stopDurationSec.toFixed(1)),
            distanceToVictimM: distanceToVictimM === null ? null : Number(distanceToVictimM.toFixed(2)),
          },
          severity: 'INFO',
        }));
        tracks.push(this._buildTrack({
          incidentId,
          helperId,
          ts,
          location: loc,
          distanceToVictimM,
          speedMps,
          sampleReason: 'stop_end',
        }));

        helperState.activeStop = null;
        helperState.stopExitCandidateAt = null;
        helperState.stopCandidateStartAt = ts;
        helperState.stopAnchor = { lat: loc.lat, lng: loc.lng };
      }
    } else {
      helperState.stopExitCandidateAt = null;
    }
  }

  _buildEvent({ incidentId, helperId = null, eventType, ts, location = null, details = {}, severity = 'INFO' }) {
    const safeLocation = location
      ? { lat: Number(location.lat), lng: Number(location.lng ?? location.long) }
      : { lat: null, lng: null };

    return {
      incidentId,
      helperId,
      eventType,
      ts,
      location: safeLocation,
      details,
      severity,
      ruleVersion: 'v1-minimal',
    };
  }

  _buildTrack({ incidentId, helperId, ts, location, distanceToVictimM, speedMps, sampleReason }) {
    return {
      ts,
      meta: { incidentId, helperId },
      lat: Number(location.lat),
      lng: Number(location.lng ?? location.long),
      distanceToVictimM: distanceToVictimM === null ? null : Number(distanceToVictimM.toFixed(2)),
      speedMps: speedMps === null ? null : speedMps,
      sampleReason,
    };
  }

  async _addEvent({ incidentId, helperId = null, eventType, ts = new Date(), location = null, details = {}, severity = 'INFO' }) {
    await IncidentEvent.create(
      this._buildEvent({ incidentId, helperId, eventType, ts, location, details, severity }),
    );
  }
}

const incidentTelemetryStore = new IncidentTelemetryStore();

module.exports = {
  IncidentTelemetryStore,
  incidentTelemetryStore,
  RULES,
  TRACK_TTL_SECONDS,
};
