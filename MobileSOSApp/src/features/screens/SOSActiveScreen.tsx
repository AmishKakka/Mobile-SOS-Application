import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Phone, X, MapPin } from 'lucide-react-native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

import { useSOS, USER_LOCATION, HelperLocation } from '../../services/sosService';
import { fetchRoute } from '../../utils/directions';
import { GOOGLE_MAPS_API_KEY } from '../../config/keys';

type LatLng = { latitude: number; longitude: number };
type RouteMap = Record<string, LatLng[]>;

type Props = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

// Convert radius (metres) → MapView region centred on victim
function regionForRadius(lat: number, lng: number, radiusMeters: number) {
  const padded   = radiusMeters * 1.6;
  const latDelta = (padded / 111320) * 2;
  const lngDelta = (padded / (111320 * Math.cos((lat * Math.PI) / 180))) * 2;
  return { latitude: lat, longitude: lng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

// Yellow when far, bright green when within 150m of victim
function helperPinColor(h: HelperLocation): string {
  return h.distanceMeters !== undefined && h.distanceMeters < 150 ? '#16A34A' : '#F59E0B';
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

export default function SOSActiveScreen({ navigation }: Props) {
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
  const [routes, setRoutes]           = useState<RouteMap>({});
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // ── Trigger SOS immediately on mount ────────────────────────────────────────
  useEffect(() => {
    triggerSOS();
  }, []);

  // ── Navigate back when SOS is cancelled (skip first render) ──────────────
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    if (!isSearching) navigation.replace('MainDashboard');
  }, [isSearching]);

  // ── Auto-zoom whenever search radius changes (250 → 500) ──────────────────
  useEffect(() => {
    if (searchRadius <= 0 || !mapRef.current) return;
    mapRef.current.animateToRegion(
      regionForRadius(USER_LOCATION.latitude, USER_LOCATION.longitude, searchRadius),
      800,
    );
  }, [searchRadius]);

  // ── Fetch route polyline for each newly discovered helper ─────────────────
  useEffect(() => {
    if (helpers.length === 0) return;

    helpers.forEach(async (h) => {
      if (routes[h.userId]) return; // already have this route

      setLoadingRoutes(true);
      const result = await fetchRoute(
        { latitude: h.latitude, longitude: h.longitude },
        USER_LOCATION,
        GOOGLE_MAPS_API_KEY,
        'DRIVE',
      );
      setLoadingRoutes(false);

      if (result && result.coordinates.length > 0) {
        setRoutes(prev => ({ ...prev, [h.userId]: result.coordinates }));
      }
    });
  }, [helpers]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel SOS?',
      'Are you sure you want to cancel the emergency alert?',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Cancel SOS',
          style: 'destructive',
          onPress: () => {
            cancelSOS();
            navigation.replace('MainDashboard');
          },
        },
      ],
    );
  };

  const timeRemaining = Math.max(0, 30 - timerCount);

  return (
    <View style={styles.container}>

      {/* ── Full screen map ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={regionForRadius(USER_LOCATION.latitude, USER_LOCATION.longitude, 250)}
      >
        {/* Victim — always red */}
        <Marker
          coordinate={USER_LOCATION}
          pinColor="#DC2626"
          title="YOU"
          description="Your location"
        />

        {/* Search radius circle */}
        {searchRadius > 0 && (
          <Circle
            center={USER_LOCATION}
            radius={searchRadius}
            strokeWidth={2}
            strokeColor="rgba(220, 38, 38, 0.5)"
            fillColor="rgba(220, 38, 38, 0.08)"
          />
        )}

        {/* Helper markers + route polylines */}
        {helpers.map((h) => (
          <React.Fragment key={h.userId}>
            {routes[h.userId] && (
              <Polyline
                coordinates={routes[h.userId]}
                strokeColor={helperPinColor(h)}
                strokeWidth={3}
                lineDashPattern={[6, 4]}
              />
            )}
            <Marker
              coordinate={{ latitude: h.latitude, longitude: h.longitude }}
              pinColor={helperPinColor(h)}
              title={h.name}
              description={h.distanceMeters !== undefined ? `${formatDistance(h.distanceMeters)} away` : 'Helper nearby'}
            />
          </React.Fragment>
        ))}
      </MapView>

      {/* ── Route loading indicator ── */}
      {loadingRoutes && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Fetching helper routes...</Text>
        </View>
      )}

      {/* ── Top status bar ── */}
      <SafeAreaView pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={[styles.connDot, { backgroundColor: isConnected ? '#10B981' : '#9CA3AF' }]} />
            <Text style={styles.topBarTitle}>🚨 SOS ACTIVE</Text>
          </View>
          <View style={styles.radiusBadge}>
            <Text style={styles.radiusBadgeText}>{searchRadius}m radius</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Bottom action card ── */}
      <View style={styles.card}>

        {/* Countdown status */}
        <View style={styles.statusRow}>
          <MapPin color="#DC2626" size={15} />
          <Text style={styles.statusText}>
            {timerCount < 30
              ? `Expanding radius in ${timeRemaining}s...`
              : 'Maximum radius reached'}
          </Text>
        </View>

        {/* Helper count / searching */}
        {helpers.length > 0 ? (
          <Text style={styles.helperCount}>
            ✅ {helpers.length} helper{helpers.length > 1 ? 's' : ''} found nearby
          </Text>
        ) : (
          <Text style={styles.searchingText}>Searching for nearby helpers...</Text>
        )}

        {/* Helper pills */}
        {helpers.length > 0 && (
          <View style={styles.helperList}>
            {helpers.map((h) => (
              <View key={h.userId} style={styles.helperPill}>
                <View style={[styles.helperDot, { backgroundColor: helperPinColor(h) }]} />
                <Text style={styles.helperPillText} numberOfLines={1}>
                  {h.name}
                  {h.distanceMeters !== undefined ? `  ·  ${formatDistance(h.distanceMeters)}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons — single row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.call911Btn}
            onPress={() => Alert.alert('Emergency', 'Calling 911...')}
            activeOpacity={0.85}
          >
            <Phone color="#FFF" size={18} />
            <Text style={styles.call911Text}>CALL 911</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.85}
          >
            <X color="#4B5563" size={18} />
            <Text style={styles.cancelText}>Cancel SOS</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  loadingText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 8 : 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  topBarLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connDot:         { width: 8, height: 8, borderRadius: 4 },
  topBarTitle:     { fontSize: 16, fontWeight: '900', color: '#DC2626' },
  radiusBadge:     { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  radiusBadgeText: { fontSize: 12, fontWeight: '800', color: '#DC2626' },

  card: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
  },

  statusRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statusText:    { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  helperCount:   { fontSize: 14, fontWeight: '800', color: '#10B981', marginBottom: 12 },
  searchingText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 12 },

  helperList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
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
  },
  helperDot:      { width: 8, height: 8, borderRadius: 4 },
  helperPillText: { fontSize: 12, fontWeight: '700', color: '#374151', maxWidth: 140 },

  actionRow: { flexDirection: 'row', gap: 10 },
  call911Btn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
  },
  call911Text: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelText: { color: '#4B5563', fontWeight: '800', fontSize: 15 },
});