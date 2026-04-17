import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, Phone, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { useVictimSOS } from '../sos/VictimSOSContext';
import { HelperLocation } from '../../services/sosService';

type Props = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

const RADIUS_PADDING_FACTOR = 1.5;

function regionForRadius(lat: number, lng: number, radiusMeters: number) {
  const paddedRadius = radiusMeters * RADIUS_PADDING_FACTOR;
  const latDelta = (paddedRadius / 111320) * 2;
  const lngDelta = (paddedRadius / (111320 * Math.cos((lat * Math.PI) / 180))) * 2;
  return { latitude: lat, longitude: lng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

function formatHelperDistance(distanceMeters?: number) {
  if (distanceMeters === undefined) {
    return 'nearby';
  }

  return distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;
}

function isNearVictim(helper: HelperLocation): boolean {
  return helper.distanceMeters !== undefined && helper.distanceMeters < 150;
}

export default function SOSActiveScreen({ navigation }: Props) {
  const mapRef = useRef<MapView>(null);
  const {
    currentLocation,
    loadingLocation,
    bootError,
    isSearching,
    searchRadius,
    helpers,
    isConnected,
    statusMessage,
    assignedHelpers,
    primaryAssignedHelper,
    helperPreview,
    timeLabel,
    assignedRouteCoords,
    assignedEtaText,
    cancelSOS,
    trigger911Call,
  } = useVictimSOS();

  useEffect(() => {
    if (!loadingLocation && !bootError && !isSearching) {
      navigation.popTo('MainDashboard');
    }
  }, [bootError, isSearching, loadingLocation, navigation]);

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
    }
  }, [assignedRouteCoords, currentLocation, primaryAssignedHelper, searchRadius]);

  const headerLocation = useMemo(() => {
    if (!currentLocation) {
      return 'Location unavailable';
    }
    return `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`;
  }, [currentLocation]);

  if (loadingLocation) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.errorTitle}>Loading SOS</Text>
        <Text style={styles.errorText}>Preparing your active SOS view...</Text>
      </View>
    );
  }

  if (bootError || !currentLocation) {
    return (
      <View style={styles.loadingState}>
        <Text style={styles.errorTitle}>SOS unavailable</Text>
        <Text style={styles.errorText}>{bootError || 'Current location is unavailable.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenBg}>
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

        {/* <View style={styles.locationCard}>
          <View style={styles.iconBox}>
            <MapPin color="#DC2626" size={18} />
          </View>
          <View style={styles.locationCardText}>
            <Text style={styles.cardLabel}>SOS STATUS</Text>
            <Text style={styles.cardMainText}>{statusMessage}</Text>
            <Text style={styles.cardSubText}>{headerLocation}</Text>
          </View>
        </View> */}

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

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  cancelSOS();
                  navigation.popTo('MainDashboard');
                }}
                activeOpacity={0.85}
              >
                <X color="#4B5563" size={16} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    textAlign: 'center',
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
});
