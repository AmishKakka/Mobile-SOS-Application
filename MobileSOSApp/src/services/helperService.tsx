// src/services/helperService.ts

// --- Helper Math: Haversine Formula (Converts distances to lat/lng) ---
const toRad = (value: number) => (value * Math.PI) / 180;

export interface Helper {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    distanceAway: number;
}

// ==========================================
// TASK 47: DYNAMIC HELPER GENERATION
// ==========================================
export const fetchHelpersFromAPI = async (userLat: number, userLng: number, searchRadiusInMeters: number): Promise<Helper[]> => {
    // 1. Simulate network latency (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Dynamic Randomizer: 30% chance NO ONE is found if radius < 1000m
    if (searchRadiusInMeters < 1000 && Math.random() > 0.3) {
        return []; 
    }

    // 3. Generate dynamic users strictly WITHIN the requested radius
    const mockHelpers: Helper[] = [];
    const numHelpersToSpawn = Math.floor(Math.random() * 5) + 1; 

    for (let i = 0; i < numHelpersToSpawn; i++) {
        const r = searchRadiusInMeters * Math.sqrt(Math.random()); 
        const theta = Math.random() * 2 * Math.PI; 
        
        const dy = r * Math.sin(theta);
        const dx = r * Math.cos(theta);
        
        const deltaLat = dy / 111320;
        const deltaLng = dx / (111320 * Math.cos(toRad(userLat)));

        mockHelpers.push({
            id: `helper_${Math.random().toString(36).substring(2, 11)}`,
            name: `Dynamic Helper ${i + 1}`,
            latitude: userLat + deltaLat,
            longitude: userLng + deltaLng,
            distanceAway: Math.round(r)
        });
    }

    return mockHelpers;
};

// ==========================================
// TASK 48: EXPANDING RADIUS SEARCH LOGIC
// ==========================================
export const findNearestHelpers = async (userLat: number, userLng: number) => {
    // Define the circles we want to check (500m, 1km, 2km, 5km)
    const radiusSteps = [500, 1000, 2000, 5000]; 
    
    for (let currentRadius of radiusSteps) {
        console.log(`[Search] Looking for helpers within ${currentRadius} meters...`);
        
        const foundHelpers = await fetchHelpersFromAPI(userLat, userLng, currentRadius);
        
        if (foundHelpers.length > 0) {
            console.log(`[Success] Found ${foundHelpers.length} helpers within ${currentRadius}m!`);
            return {
                helpers: foundHelpers,
                finalRadius: currentRadius
            };
        }
        console.log(`[Status] Nobody found at ${currentRadius}m. Expanding circle...`);
    }
    
    console.log("[Failed] No helpers found in the maximum 5km search area.");
    return { helpers: [], finalRadius: 5000 }; 
};