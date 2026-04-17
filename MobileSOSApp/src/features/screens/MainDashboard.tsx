import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, User, Users } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useVictimSOS } from '../sos/VictimSOSContext';

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

type DeviceLocation = {
  latitude: number;
  longitude: number;
};

const SOS_BUTTON_SIZE = 220;
const RING_SIZE = SOS_BUTTON_SIZE + 20;
const RADIUS_PADDING_FACTOR = 1.5;

function regionForRadius(lat: number, lng: number, radiusMeters: number) {
  const paddedRadius = radiusMeters * RADIUS_PADDING_FACTOR;
  const latDelta = (paddedRadius / 111320) * 2;
  const lngDelta = (paddedRadius / (111320 * Math.cos((lat * Math.PI) / 180))) * 2;
  return { latitude: lat, longitude: lng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

function formatLocationLabel(location: DeviceLocation | null) {
  if (!location) {
    return 'Location unavailable';
  }
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
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
    statusMessage,
    triggerSOS,
  } = useVictimSOS();
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isSearching) {
      navigation.navigate('SOSActive');
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
  }, [isSearching, navigation, pulseAnim, ring1Opacity, ring1Scale, ring2Opacity, ring2Scale]);

  useEffect(() => {
    if (!currentLocation || !mapRef.current) {
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
  }, [currentLocation, searchRadius]);

  const locationStatus = useMemo(
    () => (isSearching ? 'SOS is active. Opening live screen...' : statusMessage),
    [isSearching, statusMessage],
  );

  const onPressSOS = async () => {
    if (!currentLocation) {
      Alert.alert('Location not ready', 'Wait until your live location is available.');
      return;
    }

    await triggerSOS();
    navigation.navigate('SOSActive');
  };

  if (loadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.spinnerWrapper}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
        <Text style={styles.loadingTitle}>SafeGuard</Text>
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
            title="You"
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
              pinColor="#F59E0B"
              title={helper.name}
              description="Helper nearby"
            />
          ))}
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
          <View style={styles.locationCardText}>
            <Text style={styles.cardLabel}>CURRENT LOCATION</Text>
            <Text style={styles.cardMainText}>{formatLocationLabel(currentLocation)}</Text>
            <Text style={styles.cardSubText}>{locationStatus}</Text>
          </View>
        </View>

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
      </SafeAreaView>
    </View>
  );
}

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
  locationCardText: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spinnerWrapper: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
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
    color: '#FCA5A5',
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
});
