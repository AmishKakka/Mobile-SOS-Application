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

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

/**
 * Decode Google's encoded polyline format into an array of coordinates.
 * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
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

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

/**
 * Fetch a driving route between two points using the Google Directions API.
 * Returns decoded route coordinates, distance, and duration.
 * Returns null on any failure so the caller can fall back gracefully.
 */
export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
): Promise<RouteResult | null> {
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    return null;
  }

  try {
    const url =
      `${DIRECTIONS_URL}?origin=${origin.latitude},${origin.longitude}` +
      `&destination=${destination.latitude},${destination.longitude}` +
      `&mode=driving&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.length) {
      console.warn('Directions API error:', data.status, data.error_message);
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const coordinates = decodePolyline(route.overview_polyline.points);

    return {
      coordinates,
      distanceMeters: leg.distance.value,
      distanceText: leg.distance.text,
      durationSeconds: leg.duration.value,
      durationText: leg.duration.text,
    };
  } catch (error) {
    console.warn('Failed to fetch route:', error);
    return null;
  }
}
