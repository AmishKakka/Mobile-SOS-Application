import Redis from 'ioredis';
// import h3 from 'h3-node'; // Adjust this import based on the specific h3 wrapper you installed
import * as h3 from 'h3-js'

const redis = new Redis();

// Inside testPoC.js
import { triggerSOS } from './dynamic.js';

// ---------------------------------------------------------
// TEST HARNESS
// ---------------------------------------------------------

async function plantMockHelper(userId, lat, lng) {
    const cell = h3.latLngToCell(lat, lng, 9);
    await redis.sadd(`active-users:${cell}`, userId);
    await redis.hset(`last-location:${userId}`, { lat: lat, long: lng });
}

async function runTests() {
    console.log("🧹 Clearing Redis database for a clean test...\n");
    await redis.flushall();

    // Test coordinates
    const victimLat = 33.4255;
    const victimLng = -111.9400;

    console.log("📍 STEP 1: Seeding Map with Mock Helpers...");
    
    // Center: Exact same spot
    await plantMockHelper('user_center_1', victimLat, victimLng);
    await plantMockHelper('user_center_2', victimLat + 0.0001, victimLng + 0.0001);

    // Neighborhood: Ring 1-3 (Approx 500m away)
    await plantMockHelper('user_close_1', victimLat + 0.005, victimLng + 0.005);
    await plantMockHelper('user_close_2', victimLat - 0.005, victimLng - 0.005);
    await plantMockHelper('user_close_3', victimLat + 0.006, victimLng - 0.004);

    // Outer Edge: Ring 10-15 (Approx 1.5 miles away)
    await plantMockHelper('user_far_1', victimLat + 0.020, victimLng + 0.020);
    await plantMockHelper('user_far_2', victimLat - 0.020, victimLng - 0.020);
    await plantMockHelper('user_far_3', victimLat + 0.022, victimLng - 0.022);

    // Too Far: Outside 2 miles (Should be ignored)
    await plantMockHelper('user_ignored_1', victimLat + 0.100, victimLng + 0.100);

    console.log("✅ Map Seeded Successfully!\n");
    console.log("--------------------------------------------------\n");

    console.log("🧪 SCENARIO A: Testing basic proximity (Finding closest 5)...");
    const testA = await triggerSOS(victimLat, victimLng);
    console.log("Result A:", testA, "\n");

    console.log("🧪 SCENARIO B: Testing Rejection Filter...");
    console.log("Simulating 'user_center_1' and 'user_center_2' rejecting the ping...");
    const rejectedArray = ['user_center_1', 'user_center_2'];
    const testB = await triggerSOS(victimLat, victimLng, rejectedArray);
    console.log("Result B (Should NOT contain center users):", testB, "\n");

    console.log("🧪 SCENARIO C: Testing the Ripple Effect (2 Miles out)...");
    // Drop the victim slightly away from the center cluster
    const testC = await triggerSOS(victimLat + 0.015, victimLng + 0.015);
    console.log("Result C (Should find the 'user_far' group):", testC, "\n");

    console.log("🧪 SCENARIO D: Testing Circuit Breaker (No one around)...");
    // Drop the victim in the middle of the ocean (Lat 0, Lng 0)
    const testD = await triggerSOS(0, 0);
    console.log("Result D (Should trigger Escalation):", testD, "\n");

    console.log("🏁 ALL TESTS COMPLETE. Exiting...");
    process.exit(0);
}

// Execute the tests
runTests();