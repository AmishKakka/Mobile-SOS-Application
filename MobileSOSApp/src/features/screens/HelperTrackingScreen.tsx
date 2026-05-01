import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import {
  Navigation,
  MapPin,
  Clock,
  X,
  CheckCircle,
  XCircle,
  Car,
  PersonStanding,
} from 'lucide-react-native';

import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import Geolocation from 'react-native-geolocation-service';
import { fetchRoute } from '../../utils/directions';
import { GOOGLE_MAPS_API_KEY } from '../../config/keys';
import { requestForegroundLocationPermission } from '../../services/permissions';
import { getSocket, registerSocketUser } from '../../services/socketService';

const { width, height } = Dimensions.get('window');

const P = {
  bg: '#FAF9F6',
  card: '#FFFFFF',
  fieldBg: '#F4F4F0',
  textPrimary: '#111111',
  textSecondary: '#4E3F3F',
  muted: '#8F6E70',
  red: '#C8102E',
  blue: '#155E8A',
  border: '#EBE7E1',
  success: '#0F9F6E',
  amber: '#B7791F',
};

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
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function HelperTrackingScreen({
  navigation,
  route: navRoute,
}: Props) {
  const { roomId, helperId, helperName, victimName, incidentType } =
    navRoute.params;

  const [victimLocation, setVictimLocation] = useState(
    navRoute.params.victimLocation,
  );
  const [helperLocation, setHelperLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [hasReached, setHasReached] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const notes = '';
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[] | null
  >(null);
  const [routeInfo, setRouteInfo] = useState<{
    distanceText: string;
    durationText: string;
  } | null>(null);
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

  const distKm = helperLocation
    ? haversineKm(helperLocation, victimLocation)
    : 0;
  const distDisplay = routeInfo
    ? routeInfo.distanceText
    : helperLocation
    ? distKm < 0.1
      ? `${Math.round(distKm * 1000)} m`
      : `${distKm.toFixed(2)} km`
    : '--';
  const etaDisplay = routeInfo
    ? routeInfo.durationText
    : helperLocation
    ? `${Math.max(1, Math.round(distKm / 0.08))} min`
    : '--';

  useEffect(() => {
    const socket = getSocket();
    registerSocketUser(helperId, 'helper', helperName).catch(error => {
      console.warn(
        '[HELPER TRACKING] Failed to register helper socket:',
        error,
      );
    });

    const onVictimMoved = (nextLocation: { lat: number; lng: number }) => {
      setVictimLocation({
        latitude: nextLocation.lat,
        longitude: nextLocation.lng,
      });
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
        Alert.alert(
          'SOS Closed',
          payload.message || 'This incident has been closed.',
        );
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
  }, [
    distDisplay,
    elapsedSeconds,
    helperId,
    helperName,
    navigation,
    notes,
    roomId,
    victimName,
  ]);

  useEffect(() => {
    let mounted = true;

    const startLiveTracking = async () => {
      const granted = await requestForegroundLocationPermission();
      if (!granted) {
        const message =
          'Location access is required to guide you to the victim.';
        setTrackingError(message);
        setIsLoadingRoute(false);
        Alert.alert('Permission required', message);
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
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
        error => {
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
        position => {
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
        error => {
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
      const helperMoved =
        haversineKm(lastRouteRequest.helper, helperLocation) * 1000;
      const victimMoved =
        haversineKm(lastRouteRequest.victim, victimLocation) * 1000;
      if (
        helperMoved < 20 &&
        victimMoved < 20 &&
        lastRouteRequest.travelMode === travelMode
      ) {
        return;
      }
    }

    if (!routeCoords) {
      setIsLoadingRoute(true);
    }

    (async () => {
      const result = await fetchRoute(
        helperLocation,
        victimLocation,
        GOOGLE_MAPS_API_KEY,
        travelMode,
      );

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
    const timer = setInterval(
      () => setElapsedSeconds(seconds => seconds + 1),
      1000,
    );
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
      edgePadding: {
        top: 95,
        right: 50,
        bottom: hasReached ? 250 : 175,
        left: 50,
      },
      animated: true,
    });
  }, [hasReached, helperLocation, routeCoords, victimLocation]);

  const handleCompleted = useCallback(
    (outcome: 'helped' | 'cannot_handle') => {
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
    },
    [
      distDisplay,
      elapsedSeconds,
      helperId,
      navigation,
      notes,
      roomId,
      victimName,
    ],
  );

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

  const polylineCoords = helperLocation
    ? routeCoords ?? [helperLocation, victimLocation]
    : [];

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
        <Marker
          coordinate={victimLocation}
          pinColor={P.red}
          title={victimName}
          description="Victim"
        />
        {helperLocation && (
          <Marker
            coordinate={helperLocation}
            pinColor={P.blue}
            title="You"
            description="Helper"
          />
        )}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={P.blue}
            strokeWidth={routeCoords ? 4 : 3}
            lineDashPattern={routeCoords ? undefined : [8, 6]}
          />
        )}
      </MapView>

      {((!helperLocation && !trackingError) ||
        (isLoadingRoute && !routeCoords)) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={P.blue} />
            <Text style={styles.loadingText}>
              {helperLocation ? 'Loading route...' : 'Waiting for GPS fix...'}
            </Text>
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

      <View
        style={[
          styles.dashboard,
          hasReached ? styles.dashboardExpanded : styles.dashboardCompact,
        ]}
      >
        <View style={styles.sheetHandle} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={styles.dashboardContent}
        >
          <View style={styles.responseHeader}>
            <View style={styles.responseHeaderText}>
              <Text style={styles.responseEyebrow}>LIVE RESPONSE</Text>
              <Text style={styles.responseTitle} numberOfLines={1}>
                Navigating to {victimName}
              </Text>
            </View>
            <View
              style={[
                styles.responseBadge,
                hasReached && styles.responseBadgeArrived,
              ]}
            >
              <Text
                style={[
                  styles.responseBadgeText,
                  hasReached && styles.responseBadgeTextArrived,
                ]}
              >
                {hasReached ? 'ARRIVED' : 'EN ROUTE'}
              </Text>
            </View>
          </View>

          <View style={styles.routeControlRow}>
            <View style={styles.victimRow}>
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarText}>{victimName.charAt(0)}</Text>
              </View>
              <View style={styles.victimInfo}>
                <Text style={styles.victimName} numberOfLines={1}>
                  {victimName}
                </Text>
                <Text style={styles.victimMeta} numberOfLines={1}>
                  {incidentType}
                </Text>
              </View>
            </View>

            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  travelMode === 'DRIVE' && styles.modeButtonActive,
                ]}
                onPress={() => setTravelMode('DRIVE')}
                activeOpacity={0.8}
              >
                <Car
                  color={travelMode === 'DRIVE' ? '#FFF' : P.textSecondary}
                  size={15}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    travelMode === 'DRIVE' && styles.modeButtonTextActive,
                  ]}
                >
                  Drive
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  travelMode === 'WALK' && styles.modeButtonActive,
                ]}
                onPress={() => setTravelMode('WALK')}
                activeOpacity={0.8}
              >
                <PersonStanding
                  color={travelMode === 'WALK' ? '#FFF' : P.textSecondary}
                  size={15}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    travelMode === 'WALK' && styles.modeButtonTextActive,
                  ]}
                >
                  Walk
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MapPin color={P.muted} size={15} />
              <Text style={styles.statValue}>{distDisplay}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Clock color={P.muted} size={15} />
              <Text style={styles.statValue}>{etaDisplay}</Text>
              <Text style={styles.statLabel}>ETA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Navigation color={P.muted} size={15} />
              <Text style={styles.statValue}>
                {formatElapsed(elapsedSeconds)}
              </Text>
              <Text style={styles.statLabel}>Elapsed</Text>
            </View>
          </View>

          {hasReached && (
            <View style={styles.resolutionContainer}>
              <View style={styles.completionActionRow}>
                <TouchableOpacity
                  style={styles.helpedButton}
                  activeOpacity={0.8}
                  onPress={() => handleCompleted('helped')}
                >
                  <CheckCircle color="#FFF" size={18} />
                  <Text style={styles.helpedButtonText}>Helped</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cannotHandleButton}
                  activeOpacity={0.8}
                  onPress={() => handleCompleted('cannot_handle')}
                >
                  <XCircle color={P.amber} size={18} />
                  <Text style={styles.cannotHandleButtonText}>
                    Cannot Handle
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.abortButton}
            activeOpacity={0.8}
            onPress={handleAbort}
          >
            <X color={P.textSecondary} size={18} />
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
  container: { flex: 1, backgroundColor: P.bg },
  map: { width, height: Dimensions.get('window').height },
  loadingOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    alignSelf: 'center',
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250,249,246,0.96)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.blue,
  },
  dashboard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(250,249,246,0.98)',
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 22 : 14,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  dashboardCompact: {
    maxHeight: height * 0.24,
  },
  dashboardExpanded: {
    maxHeight: height * 0.42,
  },
  dashboardContent: {
    paddingBottom: 0,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: P.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  responseEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: P.blue,
    marginBottom: 2,
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: P.textPrimary,
  },
  responseBadge: {
    backgroundColor: '#E7F1F8',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  responseBadgeArrived: {
    backgroundColor: '#E8F6F0',
  },
  responseBadgeText: {
    color: P.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  responseBadgeTextArrived: {
    color: P.success,
  },
  routeControlRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 8,
  },
  victimRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.card,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    minHeight: 42,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: P.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  victimInfo: { flex: 1 },
  victimName: { fontSize: 13, fontWeight: '900', color: P.textPrimary },
  victimMeta: { fontSize: 11, color: P.textSecondary, marginTop: 1 },
  modeToggle: {
    flex: 1.05,
    flexDirection: 'row',
    backgroundColor: P.fieldBg,
    borderRadius: 12,
    padding: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 9,
  },
  modeButtonActive: { backgroundColor: P.blue },
  modeButtonText: { color: P.textSecondary, fontWeight: '800', fontSize: 12 },
  modeButtonTextActive: { color: '#FFF' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: P.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  statDivider: { display: 'none' },
  statValue: { fontSize: 13, fontWeight: '900', color: P.textPrimary },
  statLabel: { fontSize: 10, color: P.textSecondary, fontWeight: '700' },
  resolutionContainer: { marginBottom: 8 },
  notesInput: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    color: P.textPrimary,
    backgroundColor: P.fieldBg,
  },
  completionActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  helpedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.success,
    borderRadius: 12,
    minHeight: 42,
    gap: 6,
  },
  helpedButtonText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  cannotHandleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 42,
    gap: 6,
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#F7D89C',
  },
  cannotHandleButtonText: { color: P.amber, fontWeight: '900', fontSize: 13 },
  abortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  abortButtonText: { color: P.textSecondary, fontWeight: '800', fontSize: 13 },
});
