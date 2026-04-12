type LatLng = {
  latitude: number;
  longitude: number;
};

export type RouteResult = {
  coordinates: LatLng[];
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
};

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
  travelMode: 'DRIVE' | 'WALK' = 'DRIVE',
): Promise<RouteResult | null> {
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') return null;

  try {
    const body: Record<string, unknown> = {
      origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
      destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
      travelMode,
      ...(travelMode === 'DRIVE' && { routingPreference: 'TRAFFIC_AWARE' }),
    };

    const response = await fetch(ROUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.routes?.length) {
      console.warn('Routes API error:', JSON.stringify(data));
      return null;
    }

    const route = data.routes[0];
    const coordinates = decodePolyline(route.polyline.encodedPolyline);
    const durationSeconds = parseInt(route.duration, 10);
    const distanceMeters: number = route.distanceMeters;
    const distanceText = distanceMeters < 1000
      ? `${distanceMeters} m`
      : `${(distanceMeters / 1000).toFixed(2)} km`;
    const durationMins = Math.ceil(durationSeconds / 60);
    const durationText = durationMins < 60
      ? `${durationMins} min`
      : `${Math.floor(durationMins / 60)} hr ${durationMins % 60} min`;

    return { coordinates, distanceMeters, distanceText, durationSeconds, durationText };
  } catch (error) {
    console.warn('Failed to fetch route:', error);
    return null;
  }
}