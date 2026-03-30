export interface Helper {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceAway: number;
}

const toRad = (v: number) => (v * Math.PI) / 180;

export const findNearestHelpers = async (userLat: number, userLng: number, radius: number) => {
  await new Promise(r => setTimeout(r, 400));
  
  // Return ONE random helper within the current search radius
  const r = radius * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const deltaLat = (r * Math.sin(theta)) / 111320;
  const deltaLng = (r * Math.cos(theta)) / (111320 * Math.cos(toRad(userLat)));

  return {
    helpers: [{
      id: `h_${Math.random().toString(36).substring(2, 7)}`,
      name: `SafeGuard Volunteer`,
      latitude: userLat + deltaLat,
      longitude: userLng + deltaLng,
      distanceAway: Math.round(r)
    }],
    finalRadius: radius
  };
};