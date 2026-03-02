import Redis from 'ioredis';
const redis = new Redis();

export async function triggerSOS(victimLat, victimLng, rejectIds = []) {
    //rejectIds stores userIds who decline the SOS alert

    // Convert a victim lat/lng point to a hexagon index at resolution 9
    const victimCell = h3.latLngToCell(victimLat, victimLng, 9);

    // Get the center of the hexagon
    const victimCellCenterCoordinates = h3.cellToLatLng(victimCell);

    // Get the vertices of the hexagon
    const victimCellBoundry = h3.cellToBoundary(victimCell);

    const rejectIdsSet = new Set(rejectIds);

    let helpersPool = (await redis.smembers(`active-users:${victimCell}`)).filter(userId => !rejectIdsSet.has(userId));

    try{

        
        let currentRing = 1;
        const MAX_RINGS = 18;
    
        //check for more helpers in neighbor cells
        while(helpersPool.length < 5 && currentRing<=MAX_RINGS){
            
            const expandHelpersPool = h3.gridRing(victimCell, currentRing);

            for(let i=0; i<expandHelpersPool.length; i++){

                // Make the database call
                const checkForMoreHelpers = (await redis.smembers(`active-users:${expandHelpersPool[i]}`)).filter(userId => !rejectIdsSet.has(userId));
                // Merge the arrays
                helpersPool = [...new Set([...helpersPool, ...checkForMoreHelpers])];

                if(helpersPool.length >= 5){
                    break;
                }
            }

            currentRing++;
        }

        if(helpersPool.length == 0){
            return({
                status: 'CALL_EMERGENCY_CONTACTS',
                message: 'No helpers in 2 miles radius'
            })
        }
        console.log("Final Helpers Poll:" , helpersPool);
    }
    catch(error){
        console.log(error);
    }

    //Initialize Pipeline
    /*Pipelines avoid network and processing overhead by sending several 
    commands to the server together in a single communication. 
    The server then sends back a single communication with all the responses. 
    See the Pipelining page for more information.
    */
    const pipeline =  redis.multi()
    
    for(let j=0; j<helpersPool.length; j++){
        pipeline.hgetall(`last-location:${helpersPool[j]}`)
    }

    const results = await pipeline.exec();
    console.log("Results:" , results);

    const helpersDetail = [];

    for(let i = 0; i<results.length; i++){
        const error = results[i][0]
        const locationData = results[i][1];

        // If the user had location data in Redis
        if(locationData && locationData.lat){
            //parseFloat() convert Redis string to decimal
            const helpersLat = parseFloat(locationData.lat);
            const helpersLng = parseFloat(locationData.long);

            const finalDistance = calculateDistance(victimLat, victimLng, helpersLat, helpersLng);

            helpersDetail.push({
                userId: helpersPool[i],
                distance: finalDistance,
                lat: helpersLat,
                long: helpersLng
            })
        }
    }

    //Sort helpers distance in ascending order
    helpersDetail.sort((a,b) => a.distance - b.distance);
    
    //Get nearest 5 helper
    const nearestHelper = helpersDetail.slice(0,5);
    console.log("Top 5 nearest helper:" , nearestHelper);

    return nearestHelper;
}

function calculateDistance(victimLat, victimLng, lat2, long2) {
    const R = 6371e3; // Radius of the Earth in meters

    // Convert degrees to radians
    const dLat = (lat2 - victimLat) * Math.PI / 180;
    const dLon = (long2 - victimLng) * Math.PI / 180;
    const phi1 = victimLat * Math.PI / 180; // phi is latitude
    const phi2 = lat2 * Math.PI / 180;

    // Haversine formula
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in meters
    const distance = R * c;
    return distance;
}

