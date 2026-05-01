import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Home, Clock, Users, User, MapPin } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { GOOGLE_MAPS_API_KEY } from '../../config/keys';
import { useVictimSOS } from '../sos/VictimSOSContext';

// ─── Design Palette ───────────────────────────────────────────────────────────
// Red is reserved ONLY for the SOS button — everything else uses calm navy/slate.
// This makes the app feel trustworthy and safe rather than alarming at rest.
const P = {
  navy: '#1E3A5F', // primary — deep navy, calm & authoritative
  navyLight: '#EFF6FF', // light tint for icon boxes
  accent: '#0EA5E9', // sky blue — secondary actions
  sosDanger: '#DC2626', // red — ONLY SOS button & active emergency
  success: '#10B981', // green — helper confirmed
  warning: '#F59E0B', // amber — helper approaching
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  cardBg: 'rgba(255,255,255,0.96)',
  tabBg: '#FFFFFF',
  border: '#E5E7EB',
};

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

type DeviceLocation = { latitude: number; longitude: number };

const SOS_BUTTON_SIZE = 220;
const RING_SIZE = SOS_BUTTON_SIZE + 20;
const RADIUS_PADDING_FACTOR = 1.5;

function regionForRadius(lat: number, lng: number, radiusMeters: number) {
  const paddedRadius = radiusMeters * RADIUS_PADDING_FACTOR;
  const latDelta = (paddedRadius / 111320) * 2;
  const lngDelta =
    (paddedRadius / (111320 * Math.cos((lat * Math.PI) / 180))) * 2;
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

async function reverseGeocodeLocation(location: DeviceLocation) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Missing Google Maps API key.');
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.latitude},${location.longitude}&key=${GOOGLE_MAPS_API_KEY}`,
  );

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.status}`);
  }

  const payload = await response.json();
  const status = String(payload?.status || '');

  if (status !== 'OK') {
    throw new Error(
      payload?.error_message || `Reverse geocoding failed: ${status}`,
    );
  }

  const firstResult = payload?.results?.[0]?.formatted_address;

  if (typeof firstResult !== 'string' || !firstResult.trim()) {
    throw new Error('No address found for current location.');
  }

  return firstResult.trim();
}

export default function MainDashboard({ navigation }: MainDashboardProps) {
  const {
    currentLocation,
    loadingLocation,
    bootError,
    isSearching,
    searchRadius,
    helpers,
    isConnected,
    timeLabel,
    triggerSOS,
  } = useVictimSOS();

  const mapRef = useRef<MapView>(null);
  const [currentAddress, setCurrentAddress] = useState('Locating...');

  // Pulse animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;
  const mapModeKey = isSearching ? 'sos-active-map' : 'sos-idle-map';

  // Navigate to SOSActive when searching starts
  useEffect(() => {
    if (isSearching) {
      navigation.navigate('SOSActive');
    }
  }, [isSearching, navigation]);

  // Idle pulse — only runs when NOT in SOS mode
  useEffect(() => {
    if (isSearching) return;

    const bp = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    const r1 = Animated.loop(
      Animated.parallel([
        Animated.timing(ring1Scale, {
          toValue: 1.8,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(ring1Opacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    const r2 = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 1.8,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(ring2Opacity, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    bp.start();
    r1.start();
    r2.start();
    return () => {
      bp.stop();
      r1.stop();
      r2.stop();
      pulseAnim.setValue(1);
      ring1Scale.setValue(1);
      ring1Opacity.setValue(0.6);
      ring2Scale.setValue(1);
      ring2Opacity.setValue(0.4);
    };
  }, [
    isSearching,
    pulseAnim,
    ring1Opacity,
    ring1Scale,
    ring2Opacity,
    ring2Scale,
  ]);

  // Auto-zoom map to search radius
  useEffect(() => {
    if (!currentLocation || !mapRef.current) return;
    if (searchRadius > 0) {
      mapRef.current.animateToRegion(
        regionForRadius(
          currentLocation.latitude,
          currentLocation.longitude,
          searchRadius,
        ),
        800,
      );
    }
  }, [searchRadius, currentLocation]);

  useEffect(() => {
    let cancelled = false;

    if (!currentLocation) {
      setCurrentAddress('Locating...');
      return;
    }

    setCurrentAddress('Finding address...');
    reverseGeocodeLocation(currentLocation)
      .then(address => {
        if (!cancelled) {
          setCurrentAddress(address);
        }
      })
      .catch(error => {
        console.warn('[DASHBOARD] Reverse geocoding failed:', error);
        if (!cancelled) {
          setCurrentAddress('Address unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentLocation]);

  const onPressSOS = async () => {
    if (!currentLocation) {
      return;
    }
    await triggerSOS();
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.spinnerWrapper}>
          <ActivityIndicator size="large" color={P.accent} />
        </View>
        <Text style={styles.loadingTitle}>SafeGuard</Text>
        <Text style={styles.loadingText}>Acquiring GPS...</Text>
        <Text style={styles.loadingSubtext}>
          Please hold your device steady for a faster lock.
        </Text>
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Startup failed</Text>
        <Text style={styles.errorText}>{bootError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenBg}>
      {/* ── MAP ── */}
      {currentLocation && (
        <MapView
          key={mapModeKey}
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            ...currentLocation,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
          }}
        >
          <Marker
            coordinate={currentLocation}
            pinColor={P.sosDanger}
            title="You"
            description="Your location"
          />
          {isSearching && searchRadius > 0 && (
            <Circle
              center={currentLocation}
              radius={searchRadius}
              strokeWidth={2}
              strokeColor="rgba(30,58,95,0.35)"
              fillColor="rgba(30,58,95,0.07)"
            />
          )}
          {isSearching &&
            helpers.map(h => (
              <Marker
                key={h.userId}
                coordinate={{ latitude: h.latitude, longitude: h.longitude }}
                pinColor={
                  h.distanceMeters !== undefined && h.distanceMeters < 150
                    ? P.success
                    : P.warning
                }
                title={h.name}
                description={
                  h.distanceMeters !== undefined
                    ? h.distanceMeters < 1000
                      ? `${Math.round(h.distanceMeters)}m away`
                      : `${(h.distanceMeters / 1000).toFixed(1)}km away`
                    : 'Helper nearby'
                }
              />
            ))}
        </MapView>
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.logo}>SafeGuard</Text>
          <View style={styles.liveChip}>
            <View
              style={[
                styles.connDot,
                { backgroundColor: isConnected ? P.success : P.textSecondary },
              ]}
            />
            <Text style={styles.liveText}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        {/* ── Location card ── */}
        <View style={styles.locationCard}>
          <View style={styles.iconBox}>
            <MapPin color={P.navy} size={18} />
          </View>
          <View style={styles.locationCardText}>
            <Text style={styles.cardLabel}>CURRENT LOCATION</Text>
            <Text style={styles.cardMainText} numberOfLines={2}>
              {currentAddress}
            </Text>
            <Text style={styles.cardSubText}>{timeLabel}</Text>
          </View>
        </View>

        {/* ── SOS button with pulse rings ── */}
        <View style={styles.sosCenter} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.ring,
              { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
            ]}
            pointerEvents="none"
          />
          <Animated.View
            style={[
              styles.ring,
              { transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
            ]}
            pointerEvents="none"
          />
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={onPressSOS}
              style={styles.bigSosButton}
              activeOpacity={0.85}
            >
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Bottom tab bar ── */}
        <View style={styles.tabBar} pointerEvents="box-none">
          {/* Home — active tab */}
          <TouchableOpacity style={styles.tabBtn} onPress={() => {}}>
            <View style={styles.tabActiveIndicator} />
            <Home color={P.navy} size={22} />
            <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
          </TouchableOpacity>

          {/* History */}
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigation.navigate('SOSHistoryScreen')}
          >
            <Clock color={P.textSecondary} size={22} />
            <Text style={styles.tabLabel}>History</Text>
          </TouchableOpacity>

          {/* Contacts */}
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigation.navigate('EmergencyContacts')}
          >
            <Users color={P.textSecondary} size={22} />
            <Text style={styles.tabLabel}>Contacts</Text>
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity
            style={styles.tabBtn}
            onPress={() => navigation.navigate('SettingsHome')}
          >
            <User color={P.textSecondary} size={22} />
            <Text style={styles.tabLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenBg: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center' },

  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spinnerWrapper: {
    backgroundColor: 'rgba(14,165,233,0.15)',
    padding: 24,
    borderRadius: 50,
    marginBottom: 24,
  },
  loadingTitle: {
    color: '#F9FAFB',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  loadingText: {
    color: '#93C5FD',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  // Error
  errorState: {
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
  errorText: { color: '#6B7280', textAlign: 'center' },

  // Header
  header: {
    marginTop: Platform.OS === 'ios' ? 8 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
  },
  logo: { fontSize: 28, fontWeight: '900', color: '#111827' },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
  },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Location card
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
    backgroundColor: '#EFF6FF', // calm blue tint — not red
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  locationCardText: { flex: 1 },
  cardLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },
  cardMainText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSubText: { marginTop: 4, fontSize: 12, color: '#6B7280' },

  // SOS button
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
    backgroundColor: 'rgba(220,38,38,0.2)',
  },
  bigSosButton: {
    width: SOS_BUTTON_SIZE,
    height: SOS_BUTTON_SIZE,
    borderRadius: SOS_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(220,38,38,0.82)',
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

  // ── Bottom tab bar ────────────────────────────────────────────────────────────
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 10,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  tabActiveIndicator: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1E3A5F',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#1E3A5F',
    fontWeight: '800',
  },
});
