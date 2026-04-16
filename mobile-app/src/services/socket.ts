export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

export type HelperStatus = 'available' | 'en-route' | 'arrived';

export type HelperMarker = {
  id: string;
  name: string;
  etaMinutes: number;
  distanceKm: number;
  status: HelperStatus;
  lastUpdated: string;
};

export type TrackingSnapshot = {
  incidentId: string;
  connectionState: ConnectionState;
  lastSyncLabel: string;
  coverageRadiusMeters: number;
  helperCount: number;
  helpers: HelperMarker[];
};

const helperMarkers: HelperMarker[] = [
  {
    id: 'helper-1',
    name: 'Alex',
    etaMinutes: 4,
    distanceKm: 1.2,
    status: 'en-route',
    lastUpdated: '10 sec ago',
  },
  {
    id: 'helper-2',
    name: 'Priya',
    etaMinutes: 7,
    distanceKm: 2.4,
    status: 'available',
    lastUpdated: '25 sec ago',
  },
  {
    id: 'helper-3',
    name: 'Jordan',
    etaMinutes: 2,
    distanceKm: 0.6,
    status: 'arrived',
    lastUpdated: 'just now',
  },
];

export function getTrackingSnapshot(): TrackingSnapshot {
  return {
    incidentId: 'INC-24017',
    connectionState: 'connected',
    lastSyncLabel: 'Updated moments ago',
    coverageRadiusMeters: 800,
    helperCount: helperMarkers.length,
    helpers: helperMarkers,
  };
}

export function getStatusTone(status: HelperStatus): string {
  switch (status) {
    case 'arrived':
      return '#15803d';
    case 'en-route':
      return '#b45309';
    default:
      return '#1d4ed8';
  }
}
