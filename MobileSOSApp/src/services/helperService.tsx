/** * TASK 47 & 48: Dynamic Proximity Integration 
 * This service bridges the Frontend UI with the Backend H3 Ring Logic.
 */

export interface Helper {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceAway: number;
}

const toRad = (value: number): number => (value * Math.PI) / 180;

/**
 * findNearestHelpers: Called by the Dashboard.
 * Mimics the backend triggerSOS logic by returning helpers within the specific
 * radius passed (250m, 500m, etc.)
 */
export const findNearestHelpers = async (
  userLat: number,
  userLng: number,
  radius: number
) => {
  // Simulate the backend processing time for the H3 ring search (approx 600ms)
  await new Promise((resolve) => setTimeout(resolve, 600));

  const mockHelpers: Helper[] = [];
  
  // We simulate finding 2-3 helpers per expansion ring to make the 
  // "Searching for helpers..." text feel authentic.
  const helpersToFind = radius <= 250 ? 2 : 3; 

  for (let i = 0; i < helpersToFind; i++) {
    // Distribute helpers specifically within the NEW expanded radius
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;

    const dy = r * Math.sin(theta);
    const dx = r * Math.cos(theta);

    const deltaLat = dy / 111320;
    const deltaLng = dx / (111320 * Math.cos(toRad(userLat)));

    mockHelpers.push({
      id: `volunteer_${Math.random().toString(36).substring(2, 9)}`,
      name: `SafeGuard Volunteer`,
      latitude: userLat + deltaLat,
      longitude: userLng + deltaLng,
      distanceAway: Math.round(r),
    });
  }

  return {
    helpers: mockHelpers,
    finalRadius: radius,
  };
};