import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Users,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import { useVictimSOS } from '../sos/VictimSOSContext';
import { HelperLocation } from '../../services/sosService';
import { verifySecurityPin } from '../../services/securityPin';

type Props = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

const RADIUS_PADDING_FACTOR = 1.5;

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
  const [isCancelPinVisible, setIsCancelPinVisible] = useState(false);
  const [cancelPin, setCancelPin] = useState('');
  const [cancelPinError, setCancelPinError] = useState('');
  const [isVerifyingCancelPin, setIsVerifyingCancelPin] = useState(false);
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
          {
            latitude: primaryAssignedHelper.latitude,
            longitude: primaryAssignedHelper.longitude,
          },
        ],
        {
          edgePadding: { top: 110, right: 50, bottom: 210, left: 50 },
          animated: true,
        },
      );
      return;
    }

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
  }, [
    assignedRouteCoords,
    currentLocation,
    primaryAssignedHelper,
    searchRadius,
  ]);

  const responseTitle = primaryAssignedHelper
    ? 'Responder en route'
    : 'Finding nearby responders';
  const helperCountLabel =
    helpers.length === 1 ? '1 helper' : `${helpers.length} helpers`;
  const assignedHelperLabel = primaryAssignedHelper
    ? `${primaryAssignedHelper.name}${
        assignedHelpers.length > 1 ? ` +${assignedHelpers.length - 1}` : ''
      }`
    : null;
  const visibleHelperPreview = helperPreview.slice(0, 1);
  const extraHelperPreviewCount = Math.max(
    helperPreview.length - visibleHelperPreview.length,
    0,
  );
  const canVerifyCancelPin = cancelPin.length === 4 && !isVerifyingCancelPin;

  const closeCancelPinModal = () => {
    if (isVerifyingCancelPin) {
      return;
    }

    setIsCancelPinVisible(false);
    setCancelPin('');
    setCancelPinError('');
  };

  const handleCancelRequest = () => {
    setCancelPin('');
    setCancelPinError('');
    setIsCancelPinVisible(true);
  };

  const handleVerifyCancelPin = async () => {
    if (!canVerifyCancelPin) {
      setCancelPinError('Enter your 4-digit SOS PIN.');
      return;
    }

    try {
      setCancelPinError('');
      setIsVerifyingCancelPin(true);
      const verified = await verifySecurityPin(cancelPin);

      if (!verified) {
        setCancelPin('');
        setCancelPinError('Incorrect PIN. SOS is still active.');
        return;
      }

      setIsCancelPinVisible(false);
      setCancelPin('');
      cancelSOS();
      navigation.popTo('MainDashboard');
    } catch (error: any) {
      setCancelPinError(error?.message || 'Could not verify PIN.');
    } finally {
      setIsVerifyingCancelPin(false);
    }
  };

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
        <Text style={styles.errorText}>
          {bootError || 'Current location is unavailable.'}
        </Text>
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
          pinColor={P.red}
          title="You"
          description="Your current location"
        />

        {isSearching && searchRadius > 0 && (
          <Circle
            center={currentLocation}
            radius={searchRadius}
            strokeWidth={2}
            strokeColor="rgba(200, 16, 46, 0.5)"
            fillColor="rgba(200, 16, 46, 0.1)"
          />
        )}

        {isSearching &&
          helpers.map(helper => (
            <Marker
              key={helper.userId}
              coordinate={{
                latitude: helper.latitude,
                longitude: helper.longitude,
              }}
              pinColor={isNearVictim(helper) ? P.success : P.amber}
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
            strokeColor={P.blue}
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
                { backgroundColor: isConnected ? P.success : P.muted },
              ]}
            />
            <Text style={styles.headerStatusText}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        {/* <View style={styles.locationCard}>
          <View style={styles.iconBox}>
            <MapPin color={P.red} size={18} />
          </View>
          <View style={styles.locationCardText}>
            <Text style={styles.cardLabel}>SOS STATUS</Text>
            <Text style={styles.cardMainText}>{statusMessage}</Text>
            <Text style={styles.cardSubText}>{headerLocation}</Text>
          </View>
        </View> */}

        <View style={styles.activeOverlay}>
          <View style={styles.activeContent}>
            <View style={styles.incidentHeader}>
              <View style={styles.incidentTitleBlock}>
                <View style={styles.statusLine}>
                  <View style={styles.statusBadge}>
                    <AlertTriangle color={P.red} size={13} strokeWidth={2.5} />
                    <Text style={styles.statusBadgeText}>SOS ACTIVE</Text>
                  </View>
                  <View style={styles.liveResponseBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveResponseText}>
                      {isConnected ? 'LIVE' : 'OFFLINE'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.responseTitle} numberOfLines={1}>
                  {responseTitle}
                </Text>
                <Text style={styles.responseMessage} numberOfLines={1}>
                  {statusMessage}
                </Text>
              </View>
            </View>

            <View style={styles.compactMetaRow}>
              <View style={styles.compactMetaItem}>
                <MapPin color={P.red} size={14} strokeWidth={2.4} />
                <Text style={styles.compactMetaText}>{searchRadius}m</Text>
              </View>
              <View style={styles.compactMetaItem}>
                <Users color={P.success} size={14} strokeWidth={2.4} />
                <Text style={styles.compactMetaText} numberOfLines={1}>
                  {helperCountLabel}
                </Text>
              </View>
              <View style={styles.compactMetaItem}>
                <Clock color={P.blue} size={14} strokeWidth={2.4} />
                <Text style={styles.compactMetaText} numberOfLines={1}>
                  {timeLabel}
                </Text>
              </View>
            </View>

            {assignedHelperLabel ? (
              <View style={styles.assignedCompactRow}>
                <Navigation color={P.blue} size={15} strokeWidth={2.5} />
                <Text style={styles.assignedCompactText} numberOfLines={1}>
                  {assignedHelperLabel} on the way
                </Text>
                {assignedEtaText ? (
                  <Text style={styles.assignedEtaCompact} numberOfLines={1}>
                    ETA {assignedEtaText}
                  </Text>
                ) : null}
              </View>
            ) : visibleHelperPreview.length > 0 ? (
              <View style={styles.helperPillList}>
                {visibleHelperPreview.map(helper => (
                  <View key={helper.userId} style={styles.helperPill}>
                    <View
                      style={[
                        styles.helperPillDot,
                        {
                          backgroundColor: isNearVictim(helper)
                            ? P.success
                            : P.amber,
                        },
                      ]}
                    />
                    <Text numberOfLines={1} style={styles.helperPillText}>
                      {helper.name}
                    </Text>
                    <Text style={styles.helperDistanceText}>
                      {formatHelperDistance(helper.distanceMeters)}
                    </Text>
                  </View>
                ))}
                {extraHelperPreviewCount > 0 ? (
                  <View style={styles.helperPill}>
                    <Text style={styles.helperDistanceText}>
                      +{extraHelperPreviewCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.assignedCompactRow}>
                <Users color={P.amber} size={15} strokeWidth={2.5} />
                <Text style={styles.assignedCompactText} numberOfLines={1}>
                  Expanding search area
                </Text>
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
                <Phone color="#FFF" size={18} strokeWidth={2.5} />
                <Text style={styles.call911Text}>Call Emergency</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelRequest}
                activeOpacity={0.85}
              >
                <X color={P.textSecondary} size={18} strokeWidth={2.5} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={isCancelPinVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCancelPinModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.pinModalOverlay}
        >
          <View style={styles.pinModalCard}>
            <View style={styles.pinModalIcon}>
              <X color={P.red} size={24} strokeWidth={2.6} />
            </View>
            <Text style={styles.pinModalTitle}>Confirm SOS cancellation</Text>
            <Text style={styles.pinModalSubtitle}>
              Enter your 4-digit SOS PIN to cancel this active emergency
              request.
            </Text>

            <TextInput
              style={styles.cancelPinInput}
              placeholder="0000"
              placeholderTextColor="#D8B8BC"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={cancelPin}
              onChangeText={text => {
                setCancelPin(text.replace(/\D/g, '').slice(0, 4));
                setCancelPinError('');
              }}
              autoFocus
            />

            {cancelPinError ? (
              <Text style={styles.cancelPinError}>{cancelPinError}</Text>
            ) : null}

            <Pressable
              style={[
                styles.confirmCancelButton,
                !canVerifyCancelPin && styles.confirmCancelButtonDisabled,
              ]}
              onPress={handleVerifyCancelPin}
              disabled={!canVerifyCancelPin}
            >
              <Text style={styles.confirmCancelButtonText}>
                {isVerifyingCancelPin ? 'Verifying...' : 'Cancel SOS'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.keepActiveButton}
              onPress={closeCancelPinModal}
              disabled={isVerifyingCancelPin}
            >
              <Text style={styles.keepActiveButtonText}>Keep SOS Active</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenBg: { flex: 1, backgroundColor: P.bg },
  overlay: { flex: 1, alignItems: 'center' },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: P.bg,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: P.red,
    marginBottom: 8,
  },
  errorText: {
    color: P.textSecondary,
    textAlign: 'center',
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 8 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
  },
  logo: { fontSize: 28, fontWeight: '900', color: P.textPrimary },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 2,
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(250,249,246,0.95)',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  headerStatusText: {
    marginLeft: 8,
    color: P.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(250,249,246,0.96)',
    padding: 18,
    borderRadius: 24,
    width: '90%',
    alignItems: 'center',
    elevation: 8,
    marginTop: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FCE8EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  locationCardText: {
    flex: 1,
  },
  cardLabel: { fontSize: 11, fontWeight: '800', color: P.blue },
  cardMainText: { fontSize: 15, fontWeight: '800', color: P.textPrimary },
  cardSubText: { marginTop: 4, fontSize: 12, color: P.textSecondary },
  activeOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 22 : 18,
    width: '92%',
  },
  activeContent: {
    backgroundColor: 'rgba(250,249,246,0.98)',
    padding: 12,
    borderRadius: 20,
    alignItems: 'stretch',
    elevation: 15,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incidentTitleBlock: { flex: 1, minWidth: 0 },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 7,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FCE8EA',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: P.red,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  responseTitle: {
    color: P.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
  },
  responseMessage: {
    color: P.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 3,
  },
  liveResponseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F6F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: P.success,
  },
  liveResponseText: {
    color: P.success,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
  },
  compactMetaItem: {
    flex: 1,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 8,
    gap: 5,
  },
  compactMetaText: {
    color: P.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  assignedCompactRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.card,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    gap: 7,
    marginTop: 8,
  },
  assignedCompactText: {
    flex: 1,
    color: P.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  assignedEtaCompact: {
    color: P.blue,
    fontSize: 11,
    fontWeight: '900',
  },
  helperPillList: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginTop: 8,
    width: '100%',
  },
  helperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.card,
    borderRadius: 999,
    paddingLeft: 9,
    paddingRight: 7,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: P.border,
    maxWidth: '48%',
  },
  helperPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  helperPillText: {
    color: P.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    maxWidth: 84,
  },
  helperDistanceText: {
    color: P.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  call911Button: {
    flex: 1.35,
    flexDirection: 'row',
    backgroundColor: P.red,
    minHeight: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: P.red,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
  },
  call911Text: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  cancelButton: {
    flex: 0.75,
    flexDirection: 'row',
    backgroundColor: P.fieldBg,
    minHeight: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelButtonText: { color: P.textSecondary, fontWeight: '900', fontSize: 13 },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pinModalCard: {
    backgroundColor: P.bg,
    borderRadius: 24,
    padding: 22,
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
  },
  pinModalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FCE8EA',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  pinModalTitle: {
    color: P.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  pinModalSubtitle: {
    color: P.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  cancelPinInput: {
    minHeight: 58,
    backgroundColor: P.fieldBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    color: P.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 14,
    textAlign: 'center',
    paddingHorizontal: 18,
  },
  cancelPinError: {
    color: P.red,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  confirmCancelButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: P.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  confirmCancelButtonDisabled: { opacity: 0.45 },
  confirmCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  keepActiveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  keepActiveButtonText: {
    color: P.blue,
    fontSize: 14,
    fontWeight: '900',
  },
});
