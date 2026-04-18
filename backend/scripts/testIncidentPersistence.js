#!/usr/bin/env node

/**
 * testIncidentPersistence.js
 *
 * Additive verification script for `incidents` collection.
 * - Inserts a valid incident document
 * - Simulates lifecycle updates
 * - Verifies data is stored/retrievable
 * - Optionally checks schema validation (if validator is active)
 *
 * Usage:
 *   node scripts/testIncidentPersistence.js
 *   KEEP_TEST_DATA=true node scripts/testIncidentPersistence.js
 */

const assert = require('assert/strict');
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const h3 = require('h3-js');

try {
  require('dotenv').config();
} catch (_err) {
  // dotenv is optional
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/mobile_sos';

const H3_RESOLUTION = Number(process.env.H3_RESOLUTION || 9);

function makeIncidentId(prefix = 'test_incident') {
  return `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

function buildIncidentDoc({
  incidentId = makeIncidentId(),
  personInNeedId = 'pin_test_001',
  lat = 33.4484,
  lng = -112.074,
  incidentType = 'MEDICAL',
} = {}) {
  const now = new Date();
  const h3Cell = h3.latLngToCell(lat, lng, H3_RESOLUTION);

  return {
    _id: incidentId,
    personInNeedId,
    incidentType,
    status: 'OPEN',
    triggerSource: 'BUTTON',
    responseMode: 'HELPERS',
    startedAt: now,
    endedAt: null,
    resolution: null,
    locationSnapshot: {
      h3Cell,
    },
    helpers: [
      {
        helperId: 'helper_test_001',
        status: 'ASSIGNED',
        assignedAt: now,
        respondedAt: null,
        arrivedAt: null,
      },
    ],
    emergencyContactsNotified: ['contact_test_001'],
    externalSupport: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function getCollectionMeta(db, name) {
  const rows = await db.listCollections({ name }, { nameOnly: false }).toArray();
  return rows[0] || null;
}

async function run() {
  const createdIncidentIds = new Set();
  let incidents = null;

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    const db = mongoose.connection.db;
    const meta = await getCollectionMeta(db, 'incidents');

    assert.ok(
      meta,
      'Collection "incidents" not found. Initialize DB schema first (mongo-setup).',
    );

    const hasValidator = Boolean(meta.options?.validator?.$jsonSchema);
    incidents = db.collection('incidents');

    // Test Case 1: Seed/insert incident
    const incident = buildIncidentDoc();
    await incidents.insertOne(incident);
    createdIncidentIds.add(incident._id);

    const inserted = await incidents.findOne({ _id: incident._id });
    assert.ok(inserted, 'Inserted incident was not found in database.');
    assert.equal(inserted.status, 'OPEN');
    assert.equal(inserted.incidentType, 'MEDICAL');

    // Test Case 2: Simulate helper accepted -> incident IN_PROGRESS
    const acceptedAt = new Date(incident.startedAt.getTime() + 45_000);
    const inProgressResult = await incidents.updateOne(
      { _id: incident._id, 'helpers.helperId': 'helper_test_001' },
      {
        $set: {
          status: 'IN_PROGRESS',
          'helpers.$.status': 'ACCEPTED',
          'helpers.$.respondedAt': acceptedAt,
          updatedAt: new Date(),
        },
      },
    );
    assert.equal(inProgressResult.matchedCount, 1, 'Could not match incident for IN_PROGRESS update.');

    const inProgressDoc = await incidents.findOne({ _id: incident._id });
    assert.equal(inProgressDoc.status, 'IN_PROGRESS');
    assert.equal(inProgressDoc.helpers[0].status, 'ACCEPTED');

    // Test Case 3: Simulate helper arrival -> incident COMPLETED
    const endedAt = new Date(incident.startedAt.getTime() + 180_000);
    const completedResult = await incidents.updateOne(
      { _id: incident._id, 'helpers.helperId': 'helper_test_001' },
      {
        $set: {
          status: 'COMPLETED',
          endedAt,
          resolution: 'HELPER_RESOLVED',
          'helpers.$.status': 'ARRIVED',
          'helpers.$.arrivedAt': endedAt,
          updatedAt: new Date(),
        },
      },
    );
    assert.equal(completedResult.matchedCount, 1, 'Could not match incident for COMPLETED update.');

    const completedDoc = await incidents.findOne({ _id: incident._id });
    assert.equal(completedDoc.status, 'COMPLETED');
    assert.equal(completedDoc.resolution, 'HELPER_RESOLVED');
    assert.ok(completedDoc.endedAt, 'endedAt was not stored.');

    // Test Case 4: Query check (index-friendly fields)
    const completedCount = await incidents.countDocuments({
      personInNeedId: incident.personInNeedId,
      status: 'COMPLETED',
    });
    assert.ok(completedCount >= 1, 'Expected at least one COMPLETED incident for this person.');

    // Optional Test Case 5: schema validator rejects bad enum values
    if (hasValidator) {
      const badIncident = buildIncidentDoc({
        incidentId: makeIncidentId('invalid_incident'),
      });
      badIncident.incidentType = 'INVALID_TYPE';

      let rejected = false;
      try {
        await incidents.insertOne(badIncident);
        createdIncidentIds.add(badIncident._id);
      } catch (error) {
        const msg = String(error?.message || '');
        if (error?.code === 121 || /Document failed validation/i.test(msg)) {
          rejected = true;
        } else {
          throw error;
        }
      }

      assert.ok(
        rejected,
        'Schema validator should reject invalid incidentType values.',
      );
    } else {
      console.log('[SKIP] Validator test skipped: no MongoDB validator detected on incidents collection.');
    }

    console.log('PASS: incident persistence test cases completed successfully.');
    console.log(`incidentId=${Array.from(createdIncidentIds)[0]}`);
  } catch (error) {
    console.error('FAIL: incident persistence test cases failed.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    const shouldKeepData = String(process.env.KEEP_TEST_DATA || '').toLowerCase() === 'true';

    if (incidents && !shouldKeepData && createdIncidentIds.size > 0) {
      await incidents.deleteMany({ _id: { $in: Array.from(createdIncidentIds) } });
      console.log(`Cleaned up ${createdIncidentIds.size} test incident(s).`);
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

run();
