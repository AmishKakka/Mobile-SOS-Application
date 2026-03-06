const Redis = require('ioredis');
const redis = new Redis({
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
});

redis.on('error', (error) => {
    // Prevent unhandled event noise; caller-level flows report actionable errors.
});

async function addNewUserLocation(userId, h3Index, longitude, latitude) {
    try {
        // add the user's location 
        await redis.hset(`active-users:${h3Index}:${userId}`, 
            {lat: latitude, long: longitude});
        console.log(`Current known location of ${userId}: lat: ${latitude}, long: ${longitude}`);

        // update the last known location of the user as current location
        await redis.hset(`last-location:${userId}`,
            {region: h3Index, lat: latitude, long: longitude}
        );
    }
    catch (error) {
        console.log(error);
    }
}

async function updateLocation(userId, newH3Index, longitude, latitude) {
    try {
        // get last know location of the user
        const oldLoc = await redis.hgetall(`last-location:${userId}`);
        console.log(`Last known location of ${userId}: `, oldLoc);

        // update the user's location 
        await redis.del(`active-users:${oldLoc.region}:${userId}`);
        await redis.hset(`active-users:${newH3Index}:${userId}`, 
            {lat: latitude, long: longitude});

        // update the last known location of the user as current location
        await redis.hset(`last-location:${userId}`,
            {region: newH3Index, lat: latitude, long: longitude}
        );
        const res = await redis.hgetall(`last-location:${userId}`);
        console.log(`Current known location of ${userId}: `, res);
    }
    catch (error) {
        console.log(error);
    }
}


async function main() {
    await addNewUserLocation('user123', "demohash123", -122.4194, 37.7749);
    await updateLocation('user123', "demohash456", -122, 40);
}

if (require.main === module) {
    main()
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        })
        .finally(async () => {
            try {
                await redis.quit();
            } catch (_error) {
                redis.disconnect();
            }
        });
}

module.exports = {
    addNewUserLocation,
    updateLocation,
    main,
};
