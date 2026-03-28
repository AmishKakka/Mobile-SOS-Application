// src/services/helperService.tsx

/** * TASK 47 & 48: Dynamic Helper Logic 
 * This file handles the mathematical generation of 5 helpers 
 * within a specific radius passed from the Dashboard.
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
 * Generates exactly 5 mock helpers within the provided radius.
 * No 30% failure chance here—the Dashboard controls the "waiting" period.
 */
export const fetchHelpersFromAPI = async (
  userLat: number,
  userLng: number,
  radius: number
): Promise<Helper[]> => {
  // Simulate network latency (800ms)
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockHelpers: Helper[] = [];
  const count = 5;

  for (let i = 0; i < count; i++) {
    // Square root distribution for even spreading inside the circle
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;

    const dy = r * Math.sin(theta);
    const dx = r * Math.cos(theta);

    const deltaLat = dy / 111320;
    const deltaLng = dx / (111320 * Math.cos(toRad(userLat)));

    mockHelpers.push({
      id: `helper_${Math.random().toString(36).substring(2, 11)}`,
      name: `SafeGuard Volunteer ${i + 1}`,
      latitude: userLat + deltaLat,
      longitude: userLng + deltaLng,
      distanceAway: Math.round(r),
    });
  }

  return mockHelpers;
};

/**
 * Task 48: Search entry point called after the 35-second timer.
 */
export const findNearestHelpers = async (
  userLat: number,
  userLng: number,
  radius: number
) => {
  const helpers = await fetchHelpersFromAPI(userLat, userLng, radius);
  return {
    helpers,
    finalRadius: radius,
  };
};