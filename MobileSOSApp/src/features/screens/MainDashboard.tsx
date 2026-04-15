import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, User, Users, Phone, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';

import {
  getStoredDemoSession,
  getOrCreateDemoSession,
} from '../../services/demoSession';
import { GOOGLE_MAPS_API_KEY } from '../../config/keys';
import { restoreCommunityAvailability } from '../../services/communityAvailability';
import { registerDeviceForPush, subscribeToTokenRefresh } from '../../services/fcmSetup';
import { requestForegroundLocationPermission } from '../../services/permissions';
import { registerSocketUser } from '../../services/socketService';
import { HelperLocation, useSOS } from '../../services/sosService';
import { fetchRoute } from '../../utils/directions';

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

type DeviceLocation = {
  latitude: number;
  longitude: number;
};

const RADIUS_PADDING_FACTOR = 1.5;

function regionForRadius(lat: number, lng: number, radiusMeters: number) {
  const paddedRadius = radiusMeters * RADIUS_PADDING_FACTOR;
  const latDelta = (paddedRadius / 111320) * 2;
  const lngDelta = (paddedRadius / (111320 * Math.cos((lat * Math.PI) / 180))) * 2;
  return { latitude: lat, longitude: lng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

function isNearVictim(helper: HelperLocation): boolean {
  return helper.distanceMeters !== undefined && helper.distanceMeters < 150;
}

function formatLocationLabel(location: DeviceLocation | null) {
  if (!location) {
    return 'Location unavailable';
  }
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

function formatHelperDistance(distanceMeters?: number) {
  if (distanceMeters === undefined) {
    return 'nearby';
  }

  return distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;
}

function haversineMeters(a: DeviceLocation, b: DeviceLocation) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function MainDashboard({ navigation }: MainDashboardProps) {
  const [session, setSession] = useState<{ userId: string; name: string } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<DeviceLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [assignedRouteCoords, setAssignedRouteCoords] = useState<DeviceLocation[] | null>(null);
  const [assignedEtaText, setAssignedEtaText] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const emergencyDialPromptedRef = useRef(false);
  const lastAssignedRouteRef = useRef<{
    victim: DeviceLocation;
    helper: DeviceLocation;
  } | null>(null);

  const {
    isSearching,
    isEscalated,
    searchRadius,
    timerCount,
    helpers,
    isConnected,
    statusMessage,
    assignedHelperIds,
    triggerSOS,
    cancelSOS,
  } = useSOS({
    userId: session?.userId,
    currentLocation,
    onVictimLocationUpdate: setCurrentLocation,
  });

  const trigger911Call = async () => {
    try {
      await Linking.openURL('tel:911');
    } catch {
      Alert.alert('Error', 'Could not open the dialer.');
    }
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let unsubscribeTokenRefresh: (() => void) | undefined;

    const bootstrap = async () => {
      try {
        const demoSession = await getOrCreateDemoSession('victim', 'Demo Victim');

        setSession(demoSession);
        registerSocketUser(demoSession.userId, demoSession.role, demoSession.name);
        const helperAvailability = await restoreCommunityAvailability();
        try {
          const helperSession = await getStoredDemoSession('helper');
          const pushSession =
            helperAvailability.isAvailable && helperSession
              ? helperSession
              : demoSession;
          await registerDeviceForPush(pushSession);
          unsubscribeTokenRefresh = subscribeToTokenRefresh(pushSession);
        } catch (pushError) {
          console.warn('[FCM] Push setup skipped on victim app:', pushError);
        }

        const granted = await requestForegroundLocationPermission();
        if (!granted) {
          throw new Error('Location permission was denied.');
        }

        const applyBootLocation = (position: any) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLoadingLocation(false);
        };

        const refineLocation = () => {
          Geolocation.getCurrentPosition(
            (position) => {
              applyBootLocation(position);
            },
            (error) => {
              console.warn('[LOCATION] High accuracy refinement failed:', error);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 5000,
              forceLocationManager: true,
              showLocationDialog: true,
            },
          );
        };

        Geolocation.getCurrentPosition(
          (position) => {
            applyBootLocation(position);
            refineLocation();
          },
          () => {
            Geolocation.getCurrentPosition(
              (position) => {
                applyBootLocation(position);
              },
              (error) => {
                setBootError(error.message);
                setLoadingLocation(false);
              },
              {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000,
                forceLocationManager: true,
                showLocationDialog: true,
              },
            );
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 60000,
            forceLocationManager: true,
            showLocationDialog: true,
          },
        );
      } catch (error: any) {
        setBootError(error?.message || 'Failed to initialize dashboard.');
        setLoadingLocation(false);
      }
    };

    bootstrap();

    return () => {
      unsubscribeTokenRefresh?.();
    };
  }, []);

  useEffect(() => {
    if (isSearching) {
      return;
    }

    const buttonPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );

    const ring1 = Animated.loop(
      Animated.parallel([
        Animated.timing(ring1Scale, { toValue: 1.8, duration: 1800, useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );

    const ring2 = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(ring2Scale, { toValue: 1.8, duration: 1800, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
      ]),
    );

    buttonPulse.start();
    ring1.start();
    ring2.start();

    return () => {
      buttonPulse.stop();
      ring1.stop();
      ring2.stop();
      pulseAnim.setValue(1);
      ring1Scale.setValue(1);
      ring1Opacity.setValue(0.6);
      ring2Scale.setValue(1);
      ring2Opacity.setValue(0.4);
    };
  }, [isSearching, pulseAnim, ring1Opacity, ring1Scale, ring2Opacity, ring2Scale]);

  useEffect(() => {
    if (!isEscalated) {
      emergencyDialPromptedRef.current = false;
      return;
    }

    if (emergencyDialPromptedRef.current) {
      return;
    }

    emergencyDialPromptedRef.current = true;
    trigger911Call().catch(() => undefined);
  }, [isEscalated]);

  const helperPreview = useMemo(() => helpers.slice(0, 5), [helpers]);
  const assignedHelpers = useMemo(
    () => helpers.filter((helper) => assignedHelperIds.includes(helper.userId)),
    [assignedHelperIds, helpers],
  );
  const primaryAssignedHelper = useMemo(
    () => assignedHelpers[0] ?? null,
    [assignedHelpers],
  );

  useEffect(() => {
    if (!currentLocation || !mapRef.current) {
      return;
    }

    if (primaryAssignedHelper) {
      mapRef.current.fitToCoordinates(
        assignedRouteCoords ?? [
          currentLocation,
          { latitude: primaryAssignedHelper.latitude, longitude: primaryAssignedHelper.longitude },
        ],
        {
          edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
          animated: true,
        },
      );
      return;
    }

    if (searchRadius > 0) {
      mapRef.current.animateToRegion(
        regionForRadius(currentLocation.latitude, currentLocation.longitude, searchRadius),
        800,
      );
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      800,
    );
  }, [assignedRouteCoords, currentLocation, primaryAssignedHelper, searchRadius]);

  const timeLabel = useMemo(() => {
    if (!isSearching) {
      return 'Press SOS to request nearby help.';
    }
    return `Active for ${timerCount}s`;
  }, [isSearching, timerCount]);

  useEffect(() => {
    let cancelled = false;

    if (!isSearching || !currentLocation || !primaryAssignedHelper) {
      setAssignedRouteCoords(null);
      setAssignedEtaText(null);
      lastAssignedRouteRef.current = null;
      return;
    }

    const helperLocation = {
      latitude: primaryAssignedHelper.latitude,
      longitude: primaryAssignedHelper.longitude,
    };

    const lastAssignedRoute = lastAssignedRouteRef.current;
    if (lastAssignedRoute) {
      const victimMoved = haversineMeters(lastAssignedRoute.victim, currentLocation);
      const helperMoved = haversineMeters(lastAssignedRoute.helper, helperLocation);
      if (victimMoved < 20 && helperMoved < 20) {
        return;
      }
    }

    (async () => {
      const result = await fetchRoute(currentLocation, helperLocation, GOOGLE_MAPS_API_KEY, 'DRIVE');
      if (cancelled || !result) {
        return;
      }

      setAssignedRouteCoords(result.coordinates);
      setAssignedEtaText(result.durationText);
      lastAssignedRouteRef.current = {
        victim: currentLocation,
        helper: helperLocation,
      };
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLocation, isSearching, primaryAssignedHelper]);

  const onPressSOS = async () => {
    if (!currentLocation) {
      Alert.alert('Location not ready', 'Wait until your live location is available.');
      return;
    }
    await triggerSOS();
  };

  if (loadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        {/* The radar/pulse circle around the spinner */}
        <View style={styles.spinnerWrapper}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>

        {/* Brand Name */}
        <Text style={styles.loadingTitle}>SafeGuard</Text>

        {/* Reassuring Status Text */}
        <Text style={styles.loadingText}>Acquiring high-accuracy GPS...</Text>
        <Text style={styles.loadingSubtext}>Please hold your device steady for a faster lock.</Text>
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.errorTitle}>Startup failed</Text>
        <Text style={styles.errorText}>{bootError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenBg}>
      {currentLocation && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          }}
        >
          <Marker
            coordinate={currentLocation}
            pinColor="#DC2626"
            title={session?.name || 'You'}
            description="Your current location"
          />

          {searchRadius > 0 && (
            <Circle
              center={currentLocation}
              radius={searchRadius}
              strokeWidth={2}
              strokeColor="rgba(220, 38, 38, 0.5)"
              fillColor="rgba(220, 38, 38, 0.1)"
            />
          )}

          {helpers.map((helper) => (
            <Marker
              key={helper.userId}
              coordinate={{ latitude: helper.latitude, longitude: helper.longitude }}
              pinColor={isNearVictim(helper) ? '#16A34A' : '#F59E0B'}
              title={helper.name}
              description={
                helper.distanceMeters !== undefined
                  ? helper.distanceMeters < 1000
                    ? `${Math.round(helper.distanceMeters)}m away`
                    : `${(helper.distanceMeters / 1000).toFixed(1)}km away`
                  : 'Helper nearby'
              }
            />
          ))}

          {assignedRouteCoords && assignedRouteCoords.length > 1 && (
            <Polyline
              coordinates={assignedRouteCoords}
              strokeColor="#2563EB"
              strokeWidth={4}
            />
          )}
        </MapView>
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.logo}>SafeGuard</Text>
          <View style={styles.headerStatus}>
            <View
              style={[
                styles.connDot,
                { backgroundColor: isConnected ? '#10B981' : '#9CA3AF' },
              ]}
            />
            <Text style={styles.headerStatusText}>{isConnected ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.iconBox}>
            <MapPin color="#DC2626" size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{isSearching ? 'SOS STATUS' : 'CURRENT LOCATION'}</Text>
            <Text style={styles.cardMainText}>{isSearching ? statusMessage : formatLocationLabel(currentLocation)}</Text>
            <Text style={styles.cardSubText}>{timeLabel}</Text>
          </View>
        </View>

        {!isSearching && (
          <View style={styles.sosCenter} pointerEvents="box-none">
            <Animated.View
              style={[styles.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]}
              pointerEvents="none"
            />
            <Animated.View
              style={[styles.ring, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]}
              pointerEvents="none"
            />
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity onPress={onPressSOS} style={styles.bigSosButton} activeOpacity={0.85}>
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {isSearching && (
          <View style={styles.activeOverlay}>
            <View style={styles.activeContent}>
              <Text style={styles.sosActiveTitle}>SOS ACTIVE</Text>
              <Text style={styles.searchingCountdown}>{statusMessage}</Text>
              {helpers.length > 0 && (
                <Text style={styles.helperCount}>
                  {helpers.length} helper{helpers.length > 1 ? 's' : ''} visible on map
                </Text>
              )}
              {primaryAssignedHelper && (
                <Text style={styles.assignedHelperText}>
                  {primaryAssignedHelper.name}
                  {assignedHelpers.length > 1 ? ` +${assignedHelpers.length - 1} more` : ''}
                  {' is on the way'}
                  {assignedEtaText ? ` · ETA ${assignedEtaText}` : ''}
                </Text>
              )}
              <View style={styles.searchMetaRow}>
                <View style={styles.searchMetaItem}>
                  <MapPin color="#DC2626" size={15} />
                  <Text style={styles.searchMetaText}>{searchRadius}m radius</Text>
                </View>
                <View style={styles.searchMetaItem}>
                  <Text style={styles.searchMetaText}>{timeLabel}</Text>
                </View>
              </View>

              {helperPreview.length > 0 && (
                <View style={styles.helperPillList}>
                  {helperPreview.map((helper) => (
                    <View key={helper.userId} style={styles.helperPill}>
                      <View
                        style={[
                          styles.helperPillDot,
                          { backgroundColor: isNearVictim(helper) ? '#16A34A' : '#F59E0B' },
                        ]}
                      />
                      <Text numberOfLines={1} style={styles.helperPillText}>
                        {helper.name} · {formatHelperDistance(helper.distanceMeters)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.call911Button}
                  onPress={() => {
                    trigger911Call().catch(() => undefined);
                  }}
                  activeOpacity={0.85}
                >
                  <Phone color="#FFF" size={16} />
                  <Text style={styles.call911Text}>CALL EMERGENCY</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={cancelSOS} activeOpacity={0.85}>
                  <X color="#4B5563" size={16} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {!isSearching && (
          <View style={styles.bottomButtonsContainer} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.bottomBtn}
              onPress={() => navigation.navigate('EmergencyContacts')}
            >
              <Users color="#4B5563" size={24} />
              <Text style={styles.bottomBtnText}>Contacts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomBtn} onPress={() => navigation.navigate('SettingsHome')}>
              <User color="#4B5563" size={24} />
              <Text style={styles.bottomBtnText}>Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const SOS_BUTTON_SIZE = 220;
const RING_SIZE = SOS_BUTTON_SIZE + 20;

const styles = StyleSheet.create({
  fullScreenBg: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center' },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    color: '#4B5563',
    textAlign: 'center',
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 8 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
  },
  logo: { fontSize: 28, fontWeight: '900', color: '#111827' },
  connDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8, marginTop: 2 },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  headerStatusText: {
    marginLeft: 8,
    color: '#374151',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    padding: 18,
    borderRadius: 24,
    width: '90%',
    alignItems: 'center',
    elevation: 8,
    marginTop: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },
  cardMainText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSubText: { marginTop: 4, fontSize: 12, color: '#6B7280' },
  sosCenter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  bigSosButton: {
    width: SOS_BUTTON_SIZE,
    height: SOS_BUTTON_SIZE,
    borderRadius: SOS_BUTTON_SIZE / 2,
    backgroundColor: '#DC2626',
    borderWidth: 10,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  sosText: { color: '#FFF', fontSize: 64, fontWeight: '900' },
  activeOverlay: { position: 'absolute', bottom: 40, width: '90%' },
  activeContent: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
  },
  sosActiveTitle: { fontSize: 20, fontWeight: '900', color: '#DC2626' },
  searchingCountdown: { marginTop: 6, fontWeight: '700', color: '#6B7280', fontSize: 13, textAlign: 'center' },
  helperCount: { marginTop: 4, marginBottom: 10, fontWeight: '700', color: '#10B981', fontSize: 13 },
  assignedHelperText: {
    marginBottom: 10,
    fontWeight: '800',
    color: '#2563EB',
    fontSize: 13,
  },
  searchMetaRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchMetaText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  helperPillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 14,
  },
  helperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: '100%',
  },
  helperPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  helperPillText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 180,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 12,
  },
  call911Button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    elevation: 3,
  },
  call911Text: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelButtonText: { color: '#4B5563', fontWeight: '700', fontSize: 13 },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 24,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 8,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
  },
  bottomBtnText: { color: '#374151', fontSize: 13, fontWeight: '700', marginLeft: 10 },
  // --- LOADING SCREEN STYLES ---
  loadingContainer: {
    flex: 1, // Takes up the whole screen
    backgroundColor: '#111827', // Sleek, modern dark gray/blue
    justifyContent: 'center', // Centers vertically
    alignItems: 'center', // Centers horizontally
    padding: 20,
  },
  spinnerWrapper: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)', // Faint, transparent red circle
    padding: 24, // Gives breathing room around the spinner
    borderRadius: 50, // Makes it a perfect circle
    marginBottom: 24, // Space between spinner and text
  },
  loadingTitle: {
    color: '#F9FAFB', // Pure white
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  loadingText: {
    color: '#FCA5A5', // Soft, light red to match the emergency theme
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#9CA3AF', // Muted gray so it doesn't overwhelm the user
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 30, // Prevents the text from stretching to the edges
  },
});
