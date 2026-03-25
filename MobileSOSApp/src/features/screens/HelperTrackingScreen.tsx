import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Navigation, AlertTriangle, MapPin, Clock, X, CheckCircle } from 'lucide-react-native';

import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

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

function formatEta(distKm: number): string {
  const walkingSpeedKmMin = 0.08;
  const mins = Math.max(1, Math.round(distKm / walkingSpeedKmMin));
  return `${mins} min`;
}

export default function HelperTrackingScreen({ navigation, route }: Props) {
  const {
    victimName = 'Sarah M.',
    victimLocation = { latitude: 33.4152, longitude: -111.9263 },
    incidentType = 'Medical Emergency',
  } = route.params ?? {};

  const [helperLocation, setHelperLocation] = useState(HELPER_START);
  const [hasReached, setHasReached] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const mapRef = useRef<MapView>(null);
  const stepRef = useRef(0);

  const distKm = haversineKm(helperLocation, victimLocation);
  const distDisplay = distKm < 0.1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(2)} km`;

  // Simulated helper movement toward victim
  useEffect(() => {
    const interval = setInterval(() => {
      stepRef.current += 1;
      const fraction = Math.min(stepRef.current / TOTAL_STEPS, 1);
      const newPos = interpolatePosition(HELPER_START, victimLocation, fraction);
      setHelperLocation(newPos);

      if (fraction >= 1) {
        clearInterval(interval);
      }
    }, STEP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [victimLocation]);

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

  // Fit map to both markers whenever helper moves
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.fitToCoordinates([helperLocation, victimLocation], {
        edgePadding: { top: 100, right: 60, bottom: 320, left: 60 },
        animated: true,
      });
    }
  }, [helperLocation, victimLocation]);

  const formatElapsed = useCallback(() => {
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  const handleMarkReached = () => {
    navigation.replace('SOSCompletion', {
      victimName,
      responseTime: formatElapsed(),
      distanceCovered: distDisplay,
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
        {/* Victim marker */}
        <Marker coordinate={victimLocation} pinColor="#DC2626" title={victimName} description="Victim" />

        {/* Helper marker */}
        <Marker coordinate={helperLocation} pinColor="#2563EB" title="You" description="Helper" />

        {/* Path line between helper and victim */}
        <Polyline
          coordinates={[helperLocation, victimLocation]}
          strokeColor="#2563EB"
          strokeWidth={3}
          lineDashPattern={[8, 6]}
        />
      </MapView>

      {/* Top status bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarPill}>
          <View style={styles.liveDot} />
          <Text style={styles.topBarText}>RESPONDING</Text>
          <Text style={styles.topBarTimer}>{formatElapsed()}</Text>
        </View>
      </View>

      {/* Bottom dashboard */}
      <View style={styles.dashboard}>
        <View style={styles.victimRow}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>{victimName.charAt(0)}</Text>
          </View>
          <View style={styles.victimInfo}>
            <Text style={styles.victimName}>{victimName}</Text>
            <View style={styles.badge}>
              <AlertTriangle color="#DC2626" size={12} />
              <Text style={styles.badgeText}>{incidentType}</Text>
            </View>
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
            <Text style={styles.statValue}>{formatEta(distKm)}</Text>
            <Text style={styles.statLabel}>ETA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Navigation color="#6B7280" size={16} />
            <Text style={styles.statValue}>{formatElapsed()}</Text>
            <Text style={styles.statLabel}>Elapsed</Text>
          </View>
        </View>

        {hasReached ? (
          <TouchableOpacity style={styles.reachedButton} activeOpacity={0.8} onPress={handleMarkReached}>
            <CheckCircle color="#FFF" size={20} />
            <Text style={styles.reachedButtonText}>Mark as Reached</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.enRouteContainer}>
            <View style={styles.enRoutePill}>
              <Navigation color="#2563EB" size={14} />
              <Text style={styles.enRouteText}>En route to victim...</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.abortButton} activeOpacity={0.8} onPress={handleAbort}>
          <X color="#6B7280" size={18} />
          <Text style={styles.abortButtonText}>Abort Response</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { width, height: Dimensions.get('window').height },

  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
  },
  topBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },
  topBarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  topBarTimer: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
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

  enRouteContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  enRoutePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  enRouteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },

  reachedButton: {
    flexDirection: 'row',
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  reachedButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
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
