import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Navigation, MapPin, Clock, X, CheckCircle, XCircle, Car, PersonStanding } from 'lucide-react-native';

import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import Geolocation from 'react-native-geolocation-service';
import { fetchRoute } from '../../utils/directions';
import { GOOGLE_MAPS_API_KEY } from '../../config/keys';
import { requestForegroundLocationPermission } from '../../services/permissions';
import { getSocket, registerSocketUser } from '../../services/socketService';

const { width, height } = Dimensions.get('window');

type TrackingParams = {
  roomId: string;
  helperId: string;
  helperName: string;
  victimName: string;
  victimLocation: { latitude: number; longitude: number };
  incidentType: string;
};

type Props = {
  navigation: NativeStackNavigationProp<ParamListBase>;
  route: RouteProp<{ params: TrackingParams }, 'params'>;
};

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

export default function HelperTrackingScreen({ navigation, route: navRoute }: Props) {
  const {
    roomId,
    helperId,
    helperName,
    victimName,
    incidentType,
  } = navRoute.params;

  const [victimLocation, setVictimLocation] = useState(navRoute.params.victimLocation);
  const [helperLocation, setHelperLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasReached, setHasReached] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceText: string; durationText: string } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<'DRIVE' | 'WALK'>('DRIVE');
  const mapRef = useRef<MapView>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastRouteRequestRef = useRef<{
    helper: { latitude: number; longitude: number };
    victim: { latitude: number; longitude: number };
    travelMode: 'DRIVE' | 'WALK';
  } | null>(null);

  const distKm = helperLocation ? haversineKm(helperLocation, victimLocation) : 0;
  const distDisplay = routeInfo
    ? routeInfo.distanceText
    : helperLocation
      ? distKm < 0.1
        ? `${Math.round(distKm * 1000)} m`
        : `${distKm.toFixed(2)} km`
      : '--';
  const etaDisplay = routeInfo ? routeInfo.durationText : helperLocation ? `${Math.max(1, Math.round(distKm / 0.08))} min` : '--';

  useEffect(() => {
    const socket = getSocket();
    registerSocketUser(helperId, 'helper', helperName);

    const onVictimMoved = (nextLocation: { lat: number; lng: number }) => {
      setVictimLocation({ latitude: nextLocation.lat, longitude: nextLocation.lng });
    };

    const onIncidentResolved = (payload: any) => {
      if (payload.roomId === roomId) {
        navigation.replace('SOSCompletion', {
          victimName,
          responseTime: formatElapsed(elapsedSeconds),
          distanceCovered: distDisplay,
          outcome: payload.outcome || 'helped',
          notes,
        });
      }
    };

    const onCancelled = (payload: any) => {
      if (payload.roomId === roomId) {
        Alert.alert('SOS Closed', payload.message || 'This incident has been closed.');
        navigation.popTo('MainDashboard');
      }
    };

    socket.on('update_victim_pin', onVictimMoved);
    socket.on('incident_resolved', onIncidentResolved);
    socket.on('cancel_alert', onCancelled);

    return () => {
      socket.off('update_victim_pin', onVictimMoved);
      socket.off('incident_resolved', onIncidentResolved);
      socket.off('cancel_alert', onCancelled);
    };
  }, [distDisplay, elapsedSeconds, helperId, helperName, navigation, notes, roomId, victimName]);

  useEffect(() => {
    let mounted = true;

    const startLiveTracking = async () => {
      const granted = await requestForegroundLocationPermission();
      if (!granted) {
        const message = 'Location access is required to guide you to the victim.';
        setTrackingError(message);
        setIsLoadingRoute(false);
        Alert.alert('Permission required', message);
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          if (!mounted) {
            return;
          }

          const initialLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setTrackingError(null);
          setHelperLocation(initialLocation);
          getSocket().emit('helper_location_update', {
            roomId,
            helperId,
            location: {
              lat: initialLocation.latitude,
              lng: initialLocation.longitude,
            },
          });
        },
        (error) => {
          setTrackingError(error.message);
          setIsLoadingRoute(false);
          Alert.alert('GPS error', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        },
      );

      watchIdRef.current = Geolocation.watchPosition(
        (position) => {
          const nextLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setTrackingError(null);
          setHelperLocation(nextLocation);
          getSocket().emit('helper_location_update', {
            roomId,
            helperId,
            location: {
              lat: nextLocation.latitude,
              lng: nextLocation.longitude,
            },
          });
        },
        (error) => {
          setTrackingError(error.message);
          console.error('[HELPER TRACKING] Location watch error:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 3000,
          fastestInterval: 2000,
        },
      );
    };

    startLiveTracking();

    return () => {
      mounted = false;
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [helperId, navigation, roomId]);

  useEffect(() => {
    let cancelled = false;

    if (!helperLocation) {
      setIsLoadingRoute(false);
      return;
    }

    const lastRouteRequest = lastRouteRequestRef.current;
    if (lastRouteRequest) {
      const helperMoved = haversineKm(lastRouteRequest.helper, helperLocation) * 1000;
      const victimMoved = haversineKm(lastRouteRequest.victim, victimLocation) * 1000;
      if (
        helperMoved < 20
        && victimMoved < 20
        && lastRouteRequest.travelMode === travelMode
      ) {
        return;
      }
    }

    if (!routeCoords) {
      setIsLoadingRoute(true);
    }

    (async () => {
      const result = await fetchRoute(helperLocation, victimLocation, GOOGLE_MAPS_API_KEY, travelMode);

      if (cancelled) {
        return;
      }

      setIsLoadingRoute(false);
      if (result) {
        setRouteCoords(result.coordinates);
        setRouteInfo({
          distanceText: result.distanceText,
          durationText: result.durationText,
        });
        lastRouteRequestRef.current = {
          helper: helperLocation,
          victim: victimLocation,
          travelMode,
        };
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [helperLocation, routeCoords, travelMode, victimLocation]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (helperLocation && distKm <= 0.05 && !hasReached) {
      setHasReached(true);
    }
  }, [distKm, hasReached, helperLocation]);

  useEffect(() => {
    if (!mapRef.current || !helperLocation) {
      return;
    }

    const coordsToFit = routeCoords ?? [helperLocation, victimLocation];
    mapRef.current.fitToCoordinates(coordsToFit, {
      edgePadding: { top: 100, right: 60, bottom: 320, left: 60 },
      animated: true,
    });
  }, [helperLocation, routeCoords, victimLocation]);

  const handleCompleted = useCallback((outcome: 'helped' | 'cannot_handle') => {
    getSocket().emit('helper_response_completed', {
      roomId,
      helperId,
      outcome,
      notes,
    });

    navigation.replace('SOSCompletion', {
      victimName,
      responseTime: formatElapsed(elapsedSeconds),
      distanceCovered: distDisplay,
      outcome,
      notes,
    });
  }, [distDisplay, elapsedSeconds, helperId, navigation, notes, roomId, victimName]);

  const handleAbort = () => {
    Alert.alert(
      'Abort Response',
      'If you abort after accepting, the backend must re-dispatch. Do this only if you genuinely cannot continue.',
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Abort',
          style: 'destructive',
          onPress: () => {
            getSocket().emit('helper_response_cancelled', {
              roomId,
              helperId,
              reason: 'Helper manually aborted the response.',
            });
            navigation.popTo('MainDashboard');
          },
        },
      ],
    );
  };

  const polylineCoords = helperLocation ? routeCoords ?? [helperLocation, victimLocation] : [];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: victimLocation.latitude,
          longitude: victimLocation.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
      >
        <Marker coordinate={victimLocation} pinColor="#DC2626" title={victimName} description="Victim" />
        {helperLocation && <Marker coordinate={helperLocation} pinColor="#2563EB" title="You" description="Helper" />}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#2563EB"
            strokeWidth={routeCoords ? 4 : 3}
            lineDashPattern={routeCoords ? undefined : [8, 6]}
          />
        )}
      </MapView>

      {((!helperLocation && !trackingError) || (isLoadingRoute && !routeCoords)) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingText}>{helperLocation ? 'Loading route...' : 'Waiting for GPS fix...'}</Text>
          </View>
        </View>
      )}

      {trackingError && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingPill}>
            <Text style={styles.loadingText}>{trackingError}</Text>
          </View>
        </View>
      )}

      <View style={[styles.dashboard, hasReached ? styles.dashboardExpanded : styles.dashboardCompact]}>
        <View style={styles.sheetHandle} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={styles.dashboardContent}
        >
          <View style={styles.responseHeader}>
            <View style={styles.responseHeaderText}>
              <Text style={styles.responseEyebrow}>LIVE RESPONSE</Text>
              <Text style={styles.responseTitle}>Navigating to {victimName}</Text>
            </View>
            <View style={[styles.responseBadge, hasReached && styles.responseBadgeArrived]}>
              <Text style={[styles.responseBadgeText, hasReached && styles.responseBadgeTextArrived]}>
                {hasReached ? 'ARRIVED' : 'EN ROUTE'}
              </Text>
            </View>
          </View>

          <View style={styles.victimRow}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarText}>{victimName.charAt(0)}</Text>
            </View>
            <View style={styles.victimInfo}>
              <Text style={styles.victimName}>{victimName}</Text>
              <Text style={styles.victimMeta}>{incidentType}</Text>
            </View>
          </View>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, travelMode === 'DRIVE' && styles.modeButtonActive]}
              onPress={() => setTravelMode('DRIVE')}
              activeOpacity={0.8}
            >
              <Car color={travelMode === 'DRIVE' ? '#FFF' : '#6B7280'} size={16} />
              <Text style={[styles.modeButtonText, travelMode === 'DRIVE' && styles.modeButtonTextActive]}>Drive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, travelMode === 'WALK' && styles.modeButtonActive]}
              onPress={() => setTravelMode('WALK')}
              activeOpacity={0.8}
            >
              <PersonStanding color={travelMode === 'WALK' ? '#FFF' : '#6B7280'} size={16} />
              <Text style={[styles.modeButtonText, travelMode === 'WALK' && styles.modeButtonTextActive]}>Walk</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MapPin color="#6B7280" size={15} />
              <Text style={styles.statValue}>{distDisplay}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Clock color="#6B7280" size={15} />
              <Text style={styles.statValue}>{etaDisplay}</Text>
              <Text style={styles.statLabel}>ETA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Navigation color="#6B7280" size={15} />
              <Text style={styles.statValue}>{formatElapsed(elapsedSeconds)}</Text>
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
              <TouchableOpacity style={styles.helpedButton} activeOpacity={0.8} onPress={() => handleCompleted('helped')}>
                <CheckCircle color="#FFF" size={20} />
                <Text style={styles.helpedButtonText}>Helped</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cannotHandleButton} activeOpacity={0.8} onPress={() => handleCompleted('cannot_handle')}>
                <XCircle color="#EA580C" size={20} />
                <Text style={styles.cannotHandleButtonText}>Cannot Handle</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.abortButton} activeOpacity={0.8} onPress={handleAbort}>
            <X color="#6B7280" size={18} />
            <Text style={styles.abortButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

function formatElapsed(elapsedSeconds: number) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
    backgroundColor: 'rgba(255,255,255,0.98)',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  dashboardCompact: {
    maxHeight: height * 0.3,
  },
  dashboardExpanded: {
    maxHeight: height * 0.52,
  },
  dashboardContent: {
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 10,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  responseHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  responseEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6B7280',
    marginBottom: 4,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  responseBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  responseBadgeArrived: {
    backgroundColor: '#DCFCE7',
  },
  responseBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  responseBadgeTextArrived: {
    color: '#15803D',
  },
  victimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: '#FFF', fontWeight: '800' },
  victimInfo: { flex: 1 },
  victimName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  victimMeta: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 10,
  },
  modeButtonActive: { backgroundColor: '#2563EB' },
  modeButtonText: { color: '#6B7280', fontWeight: '700' },
  modeButtonTextActive: { color: '#FFF' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  statValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280' },
  resolutionContainer: { marginBottom: 12 },
  notesInput: {
    minHeight: 74,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  helpedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 10,
  },
  helpedButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  cannotHandleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  cannotHandleButtonText: { color: '#EA580C', fontWeight: '800', fontSize: 15 },
  abortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  abortButtonText: { color: '#6B7280', fontWeight: '700' },
});
