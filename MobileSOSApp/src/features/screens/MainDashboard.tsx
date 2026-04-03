import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, User, Users, Phone, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

import { useSOS, USER_LOCATION, HelperLocation } from '../../services/sosService';

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

// Metres of padding around the radius circle so it doesn't hug the edge
const RADIUS_PADDING_FACTOR = 1.5;

// Convert radius in metres to latitudeDelta/longitudeDelta for animateToRegion
function regionForRadius(lat: number, lng: number, radiusMeters: number) {
  const paddedRadius = radiusMeters * RADIUS_PADDING_FACTOR;
  const latDelta  = (paddedRadius / 111320) * 2;
  const lngDelta  = (paddedRadius / (111320 * Math.cos((lat * Math.PI) / 180))) * 2;
  return { latitude: lat, longitude: lng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

// Helper is "near" if within 150m of victim — switch to bright green
function isNearVictim(h: HelperLocation): boolean {
  return h.distanceMeters !== undefined && h.distanceMeters < 150;
}

export default function MainDashboard({ navigation }: MainDashboardProps) {
  const {
    isSearching,
    searchRadius,
    timerCount,
    helpers,
    isConnected,
    triggerSOS,
    cancelSOS,
  } = useSOS();

  const mapRef = useRef<MapView>(null);

  // Pulse animation refs
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;

  // ── Idle pulse animations ────────────────────────────────────────────────
  useEffect(() => {
    if (isSearching) return;

    const buttonPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    );
    const ring1 = Animated.loop(
      Animated.parallel([
        Animated.timing(ring1Scale,   { toValue: 1.8, duration: 1800, useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0,   duration: 1800, useNativeDriver: true }),
      ]),
    );
    const ring2 = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(ring2Scale,   { toValue: 1.8, duration: 1800, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0,   duration: 1800, useNativeDriver: true }),
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
  }, [isSearching]);

  // ── Auto-zoom map whenever search radius changes ─────────────────────────
  // Fires on initial SOS trigger (250m) and again on expansion (500m)
  useEffect(() => {
    if (searchRadius <= 0 || !mapRef.current) return;
    const region = regionForRadius(
      USER_LOCATION.latitude,
      USER_LOCATION.longitude,
      searchRadius,
    );
    mapRef.current.animateToRegion(region, 800);
  }, [searchRadius]);

  const timeRemaining = 30 - timerCount;

  return (
    <View style={styles.fullScreenBg}>

      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude:       USER_LOCATION.latitude + 0.006,
          longitude:      USER_LOCATION.longitude,
          latitudeDelta:  0.025,
          longitudeDelta: 0.025,
        }}
      >
        {/* Victim — red pin */}
        <Marker
          coordinate={USER_LOCATION}
          pinColor="#DC2626"
          title="YOU"
          description="Your current location"
        />

        {/* Search radius circle */}
        {searchRadius > 0 && (
          <Circle
            center={USER_LOCATION}
            radius={searchRadius}
            strokeWidth={2}
            strokeColor="rgba(220, 38, 38, 0.5)"
            fillColor="rgba(220, 38, 38, 0.1)"
          />
        )}

        {/* Helper markers
            - Yellow (#F59E0B) when far — visible against light map background
            - Bright green (#16A34A) when within 150m of victim             */}
        {helpers.map((h: HelperLocation) => (
          <Marker
            key={h.userId}
            coordinate={{ latitude: h.latitude, longitude: h.longitude }}
            pinColor={isNearVictim(h) ? '#16A34A' : '#F59E0B'}
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

      {/* ── UI OVERLAY ── */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>SafeGuard</Text>
          <View
            style={[
              styles.connDot,
              { backgroundColor: isConnected ? '#10B981' : '#9CA3AF' },
            ]}
          />
        </View>

        {/* Status card */}
        <View style={styles.locationCard}>
          <View style={styles.iconBox}>
            <MapPin color="#DC2626" size={18} />
          </View>
          <View>
            <Text style={styles.cardLabel}>
              {isSearching ? 'SOS STATUS' : 'CURRENT LOCATION'}
            </Text>
            <Text style={styles.cardMainText}>
              {!isSearching
                ? '1831 E, Apache Blvd'
                : timerCount < 30
                ? 'Searching for helpers...'
                : 'Radius Expanded to 500m!'}
            </Text>
          </View>
        </View>

        {/* ── IDLE: SOS button ── */}
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
              <TouchableOpacity onPress={triggerSOS} style={styles.bigSosButton} activeOpacity={0.85}>
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* ── ACTIVE: SOS info card ── */}
        {isSearching && (
          <View style={styles.activeOverlay}>
            <View style={styles.activeContent}>

              <Text style={styles.sosActiveTitle}>🚨 SOS ACTIVE</Text>
              <Text style={styles.searchingCountdown}>
                {timerCount < 30
                  ? `Radius expanding in ${timeRemaining}s...`
                  : 'Radius Expanded — More helpers found'}
              </Text>
              {helpers.length > 0 && (
                <Text style={styles.helperCount}>
                  {helpers.length} helper{helpers.length > 1 ? 's' : ''} found nearby
                </Text>
              )}

              {/* ── Single row: Call 911 + Cancel ── */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.call911Button}
                  onPress={() => Alert.alert('Emergency', 'Calling 911...')}
                  activeOpacity={0.85}
                >
                  <Phone color="#FFF" size={16} />
                  <Text style={styles.call911Text}>CALL 911</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelSOS}
                  activeOpacity={0.85}
                >
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
            <TouchableOpacity
              style={styles.bottomBtn}
              onPress={() => navigation.navigate('SettingsHome')}
            >
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
  overlay:      { flex: 1, alignItems: 'center' },

  header: {
    marginTop: Platform.OS === 'ios' ? 8 : 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo:    { fontSize: 28, fontWeight: '900', color: '#111827' },
  connDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8, marginTop: 2 },

  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 20,
    width: '90%',
    alignItems: 'center',
    elevation: 8,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  cardLabel:    { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },
  cardMainText: { fontSize: 15, fontWeight: '700', color: '#111827' },

  sosCenter: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  bigSosButton: {
    width: SOS_BUTTON_SIZE, height: SOS_BUTTON_SIZE,
    borderRadius: SOS_BUTTON_SIZE / 2,
    backgroundColor: '#DC2626',
    justifyContent: 'center', alignItems: 'center',
    elevation: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16,
  },
  sosText: { color: '#FFF', fontSize: 64, fontWeight: '900' },

  // Active SOS card
  activeOverlay: { position: 'absolute', bottom: 40, width: '90%' },
  activeContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
  },
  sosActiveTitle:     { fontSize: 20, fontWeight: '900', color: '#DC2626' },
  searchingCountdown: { marginTop: 6, fontWeight: '700', color: '#6B7280', fontSize: 13 },
  helperCount:        { marginTop: 4, marginBottom: 10, fontWeight: '700', color: '#10B981', fontSize: 13 },

  // Single-row action buttons
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

  // Bottom nav
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
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 8,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
  },
  bottomBtnText: { color: '#374151', fontSize: 13, fontWeight: '700', marginLeft: 10 },
});