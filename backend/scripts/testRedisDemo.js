const assert = require('assert');
const Redis = require('ioredis');
const { main } = require('./RedisDemo.js');

const redis = new Redis({
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
});

redis.on('error', () => {
    // Keep output concise; connectivity details are reported in assertions below.
});

async function ensureRedisIsReachable() {
    try {
        await redis.ping();
    } catch (error) {
        throw new Error('Redis is not reachable at 127.0.0.1:6379. Start Redis, then rerun this test.');
    }
}

async function runTests() {
    try {
        await ensureRedisIsReachable();
        console.log('Clearing Redis database for a clean test...\n');
        await redis.flushall();

        console.log('SCENARIO A: Running RedisDemo main flow...');
        await main();
        console.log('PASS: RedisDemo flow executed\n');

        console.log('SCENARIO B: Verifying old active location key removed...');
        const oldKeyExists = await redis.exists('active-users:demohash123:user123');
        assert.strictEqual(oldKeyExists, 0, 'Old location key should be deleted after update.');
        console.log('PASS: Old active location key removed\n');

        console.log('SCENARIO C: Verifying new active location key values...');
        const newActiveLocation = await redis.hgetall('active-users:demohash456:user123');
        assert.deepStrictEqual(
            newActiveLocation,
            { lat: '40', long: '-122' },
            'New active location hash is incorrect.'
        );
        console.log('PASS: New active location key and values are correct\n');

        console.log('SCENARIO D: Verifying last-location snapshot...');
        const lastLocation = await redis.hgetall('last-location:user123');
        assert.deepStrictEqual(
            lastLocation,
            { region: 'demohash456', lat: '40', long: '-122' },
            'last-location hash is incorrect after update.'
        );
        console.log('PASS: last-location hash updated correctly\n');

        console.log('ALL REDIS DEMO TESTS PASSED');
    } catch (error) {
        console.error('REDIS DEMO TEST FAILURE:', error.message);
        process.exitCode = 1;
    } finally {
        try {
            await redis.quit();
        } catch (_error) {
            redis.disconnect();
        }
    }
}

runTests();
