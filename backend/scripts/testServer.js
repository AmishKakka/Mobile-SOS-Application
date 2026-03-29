const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const { setTimeout: delay } = require('timers/promises');

const SERVER_URL = 'http://127.0.0.1:3000';
const START_TIMEOUT_MS = 8000;
const CONNECT_TIMEOUT_MS = 4000;
const EVENT_TIMEOUT_MS = 4000;

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
            reject(new Error(`Socket ${socket.id || '(pending)'} did not connect within ${timeoutMs}ms.`));
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
            reject(new Error(`Unexpected "${eventName}" received: ${JSON.stringify(payload)}`));
        };

        const timer = setTimeout(() => {
            socket.off(eventName, onEvent);
            resolve();
        }, timeoutMs);

        socket.on(eventName, onEvent);
    });
}

async function testRootEndpoint() {
    console.log('SCENARIO A: Testing root HTTP endpoint...');
    const response = await fetch(`${SERVER_URL}/`);
    assert.strictEqual(response.status, 200, 'Expected HTTP 200 from /.');
    const html = await response.text();
    assert.ok(
        html.includes('SOS Live Tracking PoC'),
        'Expected HTML response to include page title marker.'
    );
    console.log('PASS: Root endpoint served index.html');
}

async function testSocketRoomRouting() {
    console.log('SCENARIO B: Testing Socket.io room routing...');
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

        const incidentId = '111222';
        const otherIncidentId = '999888';

        victim.emit('join_incident', { incidentId, role: 'victim' });
        helper.emit('join_incident', { incidentId, role: 'helper' });
        outsider.emit('join_incident', { incidentId: otherIncidentId, role: 'victim' });

        await delay(120);

        const victimUpdatePromise = waitForSocketEvent(victim, 'victim_map_update', EVENT_TIMEOUT_MS);
        const helperNoEchoPromise = expectNoSocketEvent(helper, 'victim_map_update', 1200);
        const outsiderNoLeakPromise = expectNoSocketEvent(outsider, 'victim_map_update', 1200);

        helper.emit('helper_location_update', {
            incidentId,
            lat: 33.4255,
            lng: -111.94,
        });

        const payload = await victimUpdatePromise;
        assert.strictEqual(payload.lat, 33.4255, 'Victim lat mismatch.');
        assert.strictEqual(payload.lng, -111.94, 'Victim lng mismatch.');
        assert.strictEqual(typeof payload.timestamp, 'number', 'timestamp must be numeric.');

        await Promise.all([helperNoEchoPromise, outsiderNoLeakPromise]);
        console.log('PASS: In-room broadcast worked and cross-room leakage was blocked');
    } finally {
        victim.disconnect();
        helper.disconnect();
        outsider.disconnect();
    }
}

async function runTests() {
    const serverPath = path.join(__dirname, '..', 'src', 'server.js');
    console.log('Starting server process for tests...');
    const serverProcess = spawn(process.execPath, [serverPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrBuffer = '';
    serverProcess.stderr.on('data', (chunk) => {
        stderrBuffer += chunk.toString();
    });

    try {
        await waitForServerReady(serverProcess, START_TIMEOUT_MS);
        await testRootEndpoint();
        await testSocketRoomRouting();
        console.log('ALL SERVER TESTS PASSED');
    } catch (error) {
        if (stderrBuffer.trim()) {
            console.error('Server stderr output:\n', stderrBuffer.trim());
        }
        console.error('SERVER TEST FAILURE:', error.message);
        process.exitCode = 1;
    } finally {
        serverProcess.kill('SIGTERM');
        await delay(200);
    }
}

runTests();
