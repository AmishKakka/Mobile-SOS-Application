import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Navigation, MapPin, Clock, X, CheckCircle, XCircle } from 'lucide-react-native';

import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { fetchRoute, type RouteResult } from '../../utils/directions';
import { GOOGLE_MAPS_API_KEY } from '../../config/keys';

const { width } = Dimensions.get('window');

type TrackingParams = {
  victimName: string;
  victimLocation: { latitude: number; longitude: number };
  distance: string;
  incidentType: string;
};

type Props = {
  navigation: NativeStackNavigationProp<ParamListBase>;
  route: RouteProp<{ params: TrackingParams }, 'params'>;
};

const HELPER_START = { latitude: 33.4225, longitude: -111.9320 };
const TOTAL_STEPS = 30;
const STEP_INTERVAL_MS = 2000;
const REACHED_THRESHOLD_KM = 0.05;

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function interpolatePosition(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  fraction: number,
) {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * fraction,
    longitude: start.longitude + (end.longitude - start.longitude) * fraction,
  };
}

export default function HelperTrackingScreen({ navigation, route: navRoute }: Props) {
  const {
    victimName = 'Sarah M.',
    victimLocation = { latitude: 33.4152, longitude: -111.9263 },
    incidentType = 'Medical Emergency',
  } = navRoute.params ?? {};

  const [helperLocation, setHelperLocation] = useState(HELPER_START);
  const [hasReached, setHasReached] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; durationText: string } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const mapRef = useRef<MapView>(null);
  const stepRef = useRef(0);

  const distKm = haversineKm(helperLocation, victimLocation);
  const distDisplay = routeInfo
    ? routeInfo.distanceText
    : distKm < 0.1
      ? `${Math.round(distKm * 1000)} m`
      : `${distKm.toFixed(2)} km`;
  const etaDisplay = routeInfo ? routeInfo.durationText : `${Math.max(1, Math.round(distKm / 0.08))} min`;

  // Fetch route from Google Directions API on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await fetchRoute(HELPER_START, victimLocation, GOOGLE_MAPS_API_KEY);

      if (cancelled) return;
      setIsLoadingRoute(false);

      if (result) {
        setRouteCoords(result.coordinates);
        setRouteInfo({
          distanceText: result.distanceText,
          durationText: result.durationText,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [victimLocation]);

  // Animate helper along route coordinates (or straight line as fallback)
  useEffect(() => {
    if (isLoadingRoute) return;

    const totalSteps = routeCoords ? routeCoords.length - 1 : TOTAL_STEPS;
    if (totalSteps <= 0) return;

    const interval = setInterval(() => {
      stepRef.current += 1;
      const step = Math.min(stepRef.current, totalSteps);

      if (routeCoords) {
        setHelperLocation(routeCoords[step]);
      } else {
        const fraction = step / totalSteps;
        setHelperLocation(interpolatePosition(HELPER_START, victimLocation, fraction));
      }

      if (step >= totalSteps) {
        clearInterval(interval);
      }
    }, STEP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isLoadingRoute, routeCoords, victimLocation]);

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect arrival
  useEffect(() => {
    if (distKm <= REACHED_THRESHOLD_KM && !hasReached) {
      setHasReached(true);
    }
  }, [distKm, hasReached]);

  // Fit map to both markers (and route) whenever helper moves
  useEffect(() => {
    if (mapRef.current) {
      const coordsToFit = routeCoords ?? [helperLocation, victimLocation];
      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: 100, right: 60, bottom: 320, left: 60 },
        animated: true,
      });
    }
  }, [helperLocation, victimLocation, routeCoords]);

  const formatElapsed = useCallback(() => {
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  const handleHelped = () => {
    navigation.replace('SOSCompletion', {
      victimName,
      responseTime: formatElapsed(),
      distanceCovered: distDisplay,
      outcome: 'helped',
      notes,
    });
  };

  const handleCannotHandle = () => {
    navigation.replace('SOSCompletion', {
      victimName,
      responseTime: formatElapsed(),
      distanceCovered: distDisplay,
      outcome: 'cannot_handle',
      notes,
    });
  };

  const handleAbort = () => {
    Alert.alert(
      'Abort Response',
      'Are you sure you want to stop responding to this emergency?',
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Abort',
          style: 'destructive',
          onPress: () => navigation.reset({
            index: 2,
            routes: [
              { name: 'AuthScreen' },
              { name: 'MainDashboard' },
              { name: 'HelperDashboard' },
            ],
          }),
        },
      ],
    );
  };

  // Build the polyline coordinates: real route or straight line fallback
  const polylineCoords = routeCoords ?? [helperLocation, victimLocation];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: (HELPER_START.latitude + victimLocation.latitude) / 2,
          longitude: (HELPER_START.longitude + victimLocation.longitude) / 2,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
      >
        <Marker coordinate={victimLocation} pinColor="#DC2626" title={victimName} description="Victim" />
        <Marker coordinate={helperLocation} pinColor="#2563EB" title="You" description="Helper" />

        <Polyline
          coordinates={polylineCoords}
          strokeColor="#2563EB"
          strokeWidth={routeCoords ? 4 : 3}
          lineDashPattern={routeCoords ? undefined : [8, 6]}
        />
      </MapView>

      {/* Route loading indicator */}
      {isLoadingRoute && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>Loading route...</Text>
          </View>
        </View>
      )}

      {/* Bottom dashboard */}
      <View style={styles.dashboard}>
        <View style={styles.victimRow}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>{victimName.charAt(0)}</Text>
          </View>
          <View style={styles.victimInfo}>
            <Text style={styles.victimName}>{victimName}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MapPin color="#6B7280" size={16} />
            <Text style={styles.statValue}>{distDisplay}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Clock color="#6B7280" size={16} />
            <Text style={styles.statValue}>{etaDisplay}</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Navigation color="#6B7280" size={16} />
            <Text style={styles.statValue}>{formatElapsed()}</Text>
            <Text style={styles.statLabel}>Elapsed</Text>
          </View>
        </View>

        {hasReached && (
          <View style={styles.resolutionContainer}>
            <TextInput
              style={styles.notesInput}
              placeholder="Add a note (optional)..."
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <TouchableOpacity style={styles.helpedButton} activeOpacity={0.8} onPress={handleHelped}>
              <CheckCircle color="#FFF" size={20} />
              <Text style={styles.helpedButtonText}>Helped</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cannotHandleButton} activeOpacity={0.8} onPress={handleCannotHandle}>
              <XCircle color="#EA580C" size={20} />
              <Text style={styles.cannotHandleButtonText}>Cannot Handle</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.abortButton} activeOpacity={0.8} onPress={handleAbort}>
          <X color="#6B7280" size={18} />
          <Text style={styles.abortButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { width, height: Dimensions.get('window').height },

  loadingOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    alignSelf: 'center',
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  dashboard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },

  victimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  victimInfo: { flex: 1 },
  victimName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
  },

  resolutionContainer: {
    marginBottom: 12,
    gap: 10,
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    minHeight: 48,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  helpedButton: {
    flexDirection: 'row',
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  helpedButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  cannotHandleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#EA580C',
  },
  cannotHandleButtonText: {
    color: '#EA580C',
    fontSize: 15,
    fontWeight: '700',
  },

  abortButton: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  abortButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },
});
