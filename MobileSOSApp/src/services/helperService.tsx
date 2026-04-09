export interface Helper {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceAway: number;
}

const toRad = (value: number): number => (value * Math.PI) / 180;

export const findNearestHelpers = async (
  userLat: number,
  userLng: number,
  radius: number
) => {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const mockHelpers: Helper[] = [];
  const helpersToFind = radius <= 250 ? 2 : 3; 

  for (let i = 0; i < helpersToFind; i++) {
    const r = radius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;

    const dy = r * Math.sin(theta);
    const dx = r * Math.cos(theta);

    const deltaLat = dy / 111320;
    const deltaLng = dx / (111320 * Math.cos(toRad(userLat)));

    mockHelpers.push({
      id: `volunteer_${Math.random().toString(36).substring(2, 9)}`,
      name: `Helper ${i + 1}`, // Needed for Task 2
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