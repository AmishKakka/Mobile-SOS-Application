const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const Redis = require('ioredis');
const h3 = require('h3-js');
const { io } = require('socket.io-client');
const { setTimeout: delay } = require('timers/promises');

const SERVER_URL = 'http://127.0.0.1:3000';
const START_TIMEOUT_MS = 10000;
const CONNECT_TIMEOUT_MS = 4000;
const EVENT_TIMEOUT_MS = 5000;

function createRedisClient() {
    const redis = new Redis({
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
    });

    redis.on('error', () => {
        // Keep test logs concise; failures are surfaced by assertions.
    });

    return redis;
}

async function ensureRedisIsReachable(redis) {
    try {
        await redis.ping();
    } catch (_error) {
        throw new Error('Redis is not reachable at 127.0.0.1:6379. Run `docker compose up -d redis` and retry.');
    }
}

function waitForServerReady(serverProcess, timeoutMs) {
    return new Promise((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
            if (finished) return;
            finished = true;
            reject(new Error(`Server did not start within ${timeoutMs}ms.`));
        }, timeoutMs);

        const onStdout = (chunk) => {
            const text = chunk.toString();
            if (text.includes('SOS Tracking PoC Server is running on port 3000')) {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                serverProcess.stdout.off('data', onStdout);
                resolve();
            }
        };

        serverProcess.stdout.on('data', onStdout);
        serverProcess.once('exit', (code) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            reject(new Error(`Server exited before startup. Exit code: ${code}`));
        });
    });
}

function waitForSocketConnect(socket, timeoutMs) {
    return new Promise((resolve, reject) => {
        if (socket.connected) {
            resolve();
            return;
        }

        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Socket did not connect within ${timeoutMs}ms.`));
        }, timeoutMs);

        const onConnect = () => {
            cleanup();
            resolve();
        };

        const onConnectError = (error) => {
            cleanup();
            reject(error);
        };

        const cleanup = () => {
            clearTimeout(timer);
            socket.off('connect', onConnect);
            socket.off('connect_error', onConnectError);
        };

        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);
    });
}

function waitForSocketEvent(socket, eventName, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(eventName, onEvent);
            reject(new Error(`Timed out waiting for event "${eventName}" in ${timeoutMs}ms.`));
        }, timeoutMs);

        const onEvent = (payload) => {
            clearTimeout(timer);
            socket.off(eventName, onEvent);
            resolve(payload);
        };

        socket.on(eventName, onEvent);
    });
}

function expectNoSocketEvent(socket, eventName, timeoutMs) {
    return new Promise((resolve, reject) => {
        const onEvent = (payload) => {
            clearTimeout(timer);
            socket.off(eventName, onEvent);
            reject(new Error(`Unexpected "${eventName}" payload: ${JSON.stringify(payload)}`));
        };

        const timer = setTimeout(() => {
            socket.off(eventName, onEvent);
            resolve();
        }, timeoutMs);

        socket.on(eventName, onEvent);
    });
}

async function seedMockHelpers(redis, victimLat, victimLng) {
    const helpers = [
        { userId: 'helper_1', lat: victimLat, lng: victimLng },
        { userId: 'helper_2', lat: victimLat + 0.0002, lng: victimLng + 0.0002 },
        { userId: 'helper_3', lat: victimLat + 0.003, lng: victimLng + 0.001 },
        { userId: 'helper_4', lat: victimLat - 0.004, lng: victimLng - 0.003 },
        { userId: 'helper_5', lat: victimLat + 0.009, lng: victimLng + 0.009 },
        { userId: 'helper_6', lat: victimLat + 0.018, lng: victimLng + 0.018 },
    ];

    for (const helper of helpers) {
        const cell = h3.latLngToCell(helper.lat, helper.lng, 9);
        await redis.sadd(`active-users:${cell}`, helper.userId);
        await redis.hset(`last-location:${helper.userId}`, {
            lat: helper.lat,
            long: helper.lng,
        });
    }
}

function assertSortedByDistance(results) {
    for (let i = 1; i < results.length; i++) {
        assert.ok(
            results[i - 1].distance <= results[i].distance,
            'Expected helpers to be sorted by ascending distance.'
        );
    }
}

async function testHttpSosTrigger() {
    console.log('SCENARIO A: HTTP /api/sos/trigger end-to-end...');
    const victimLat = 33.4255;
    const victimLng = -111.94;

    const response = await fetch(`${SERVER_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            victimLat,
            victimLng,
            rejectIds: [],
        }),
    });
    assert.strictEqual(response.status, 200, 'Expected HTTP 200 from /api/sos/trigger');

    const body = await response.json();
    assert.ok(Array.isArray(body.result), 'Expected result array for helper match.');
    assert.ok(body.result.length > 0, 'Expected at least one helper.');
    assert.ok(body.result.length <= 5, 'Expected at most 5 helpers.');
    assertSortedByDistance(body.result);

    const rejectedResponse = await fetch(`${SERVER_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            victimLat,
            victimLng,
            rejectIds: ['helper_1', 'helper_2'],
        }),
    });
    assert.strictEqual(rejectedResponse.status, 200, 'Expected HTTP 200 for rejected helper flow.');
    const rejectedBody = await rejectedResponse.json();
    const userIds = rejectedBody.result.map((item) => item.userId);
    assert.ok(!userIds.includes('helper_1'), 'Rejected helper_1 should be excluded.');
    assert.ok(!userIds.includes('helper_2'), 'Rejected helper_2 should be excluded.');

    const fallbackResponse = await fetch(`${SERVER_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            victimLat: 0,
            victimLng: 0,
            rejectIds: [],
        }),
    });
    const fallbackBody = await fallbackResponse.json();
    assert.strictEqual(
        fallbackBody.result.status,
        'CALL_EMERGENCY_CONTACTS',
        'Expected escalation status when no helpers are found.'
    );

    const invalidLatResponse = await fetch(`${SERVER_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            victimLat: 'invalid',
            victimLng,
            rejectIds: [],
        }),
    });
    assert.strictEqual(invalidLatResponse.status, 400, 'Invalid victim coords should return HTTP 400.');
    const invalidLatBody = await invalidLatResponse.json();
    assert.ok(
        typeof invalidLatBody.error === 'string' && invalidLatBody.error.includes('valid numbers'),
        'Expected validation error for invalid victim coordinates.'
    );

    const invalidRejectIdsResponse = await fetch(`${SERVER_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            victimLat,
            victimLng,
            rejectIds: 'helper_1',
        }),
    });
    assert.strictEqual(invalidRejectIdsResponse.status, 400, 'Invalid rejectIds should return HTTP 400.');
    const invalidRejectIdsBody = await invalidRejectIdsResponse.json();
    assert.strictEqual(
        invalidRejectIdsBody.error,
        'rejectIds must be an array.',
        'Expected specific validation error for rejectIds type.'
    );

    console.log('PASS: HTTP SOS trigger validated');
}

async function testSocketSosTrigger() {
    console.log('SCENARIO B: Socket trigger_sos end-to-end...');
    const socket = io(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
    });

    try {
        await waitForSocketConnect(socket, CONNECT_TIMEOUT_MS);

        const resultPromise = waitForSocketEvent(socket, 'sos_result', EVENT_TIMEOUT_MS);
        socket.emit('trigger_sos', {
            victimLat: 33.4255,
            victimLng: -111.94,
            rejectIds: [],
        });

        const payload = await resultPromise;
        assert.strictEqual(payload.ok, true, 'Expected trigger_sos to return ok=true.');
        assert.ok(Array.isArray(payload.result), 'Expected socket SOS result array.');
        assert.ok(payload.result.length > 0, 'Expected socket SOS helper matches.');

        const invalidPromise = waitForSocketEvent(socket, 'sos_result', EVENT_TIMEOUT_MS);
        socket.emit('trigger_sos', {
            victimLat: 'invalid',
            victimLng: -111.94,
            rejectIds: [],
        });
        const invalidPayload = await invalidPromise;
        assert.strictEqual(invalidPayload.ok, false, 'Expected validation failure for invalid payload.');
        assert.ok(
            typeof invalidPayload.error === 'string' && invalidPayload.error.includes('valid numbers'),
            'Expected useful validation error message.'
        );

        const invalidRejectIdsPromise = waitForSocketEvent(socket, 'sos_result', EVENT_TIMEOUT_MS);
        socket.emit('trigger_sos', {
            victimLat: 33.4255,
            victimLng: -111.94,
            rejectIds: 'helper_1',
        });
        const invalidRejectIdsPayload = await invalidRejectIdsPromise;
        assert.strictEqual(
            invalidRejectIdsPayload.ok,
            false,
            'Expected validation failure when rejectIds is not an array.'
        );
        assert.strictEqual(
            invalidRejectIdsPayload.error,
            'rejectIds must be an array.',
            'Expected useful validation error for rejectIds.'
        );

        console.log('PASS: Socket SOS trigger validated');
    } finally {
        socket.disconnect();
    }
}

async function testIncidentRoomRouting() {
    console.log('SCENARIO C: Incident room routing end-to-end...');
    const socketConfig = {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
    };

    const victim = io(SERVER_URL, socketConfig);
    const helper = io(SERVER_URL, socketConfig);
    const outsider = io(SERVER_URL, socketConfig);

    try {
        await Promise.all([
            waitForSocketConnect(victim, CONNECT_TIMEOUT_MS),
            waitForSocketConnect(helper, CONNECT_TIMEOUT_MS),
            waitForSocketConnect(outsider, CONNECT_TIMEOUT_MS),
        ]);

        const incidentId = 'room_e2e_123';
        const unrelatedIncidentId = 'room_e2e_999';
        victim.emit('join_incident', { incidentId, role: 'victim' });
        helper.emit('join_incident', { incidentId, role: 'helper' });
        outsider.emit('join_incident', { incidentId: unrelatedIncidentId, role: 'victim' });
        await delay(120);

        const victimUpdatePromise = waitForSocketEvent(victim, 'victim_map_update', EVENT_TIMEOUT_MS);
        const helperNoEchoPromise = expectNoSocketEvent(helper, 'victim_map_update', 1200);
        const outsiderNoLeakPromise = expectNoSocketEvent(outsider, 'victim_map_update', 1200);

        helper.emit('helper_location_update', {
            incidentId,
            lat: 33.4258,
            lng: -111.9398,
        });

        const payload = await victimUpdatePromise;
        assert.strictEqual(payload.lat, 33.4258, 'Victim did not receive expected latitude.');
        assert.strictEqual(payload.lng, -111.9398, 'Victim did not receive expected longitude.');
        assert.strictEqual(typeof payload.timestamp, 'number', 'Expected numeric timestamp.');

        await Promise.all([helperNoEchoPromise, outsiderNoLeakPromise]);
        console.log('PASS: Room routing and isolation validated');
    } finally {
        victim.disconnect();
        helper.disconnect();
        outsider.disconnect();
    }
}

async function runTests() {
    const redis = createRedisClient();
    const serverPath = path.join(__dirname, '..', 'src', 'server.js');
    let serverProcess;
    let stderrBuffer = '';

    try {
        await ensureRedisIsReachable(redis);
        await redis.flushall();
        await seedMockHelpers(redis, 33.4255, -111.94);

        console.log('Starting server process for E2E tests...');
        serverProcess = spawn(process.execPath, [serverPath], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        serverProcess.stderr.on('data', (chunk) => {
            stderrBuffer += chunk.toString();
        });

        await waitForServerReady(serverProcess, START_TIMEOUT_MS);

        await testHttpSosTrigger();
        await testSocketSosTrigger();
        await testIncidentRoomRouting();

        console.log('ALL E2E TESTS PASSED');
    } catch (error) {
        if (stderrBuffer.trim()) {
            console.error('Server stderr output:\n', stderrBuffer.trim());
        }
        console.error('E2E TEST FAILURE:', error.message);
        process.exitCode = 1;
    } finally {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            await delay(200);
        }
        try {
            await redis.flushall();
        } catch (_error) {
            // Ignore cleanup failures in finalizer.
        }
        try {
            await redis.quit();
        } catch (_error) {
            redis.disconnect();
        }
    }
}

runTests();
