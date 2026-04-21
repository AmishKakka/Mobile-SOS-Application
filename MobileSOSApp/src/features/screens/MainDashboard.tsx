import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Home, Clock, Users, User, MapPin, Phone, X,
  ShieldCheck, Video, Lock,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { useVictimSOS } from '../sos/VictimSOSContext';

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

// ── Palette ────────────────────────────────────────────────────────────────────
// Red (#DC2626) is ONLY used for the SOS button and active alert title.
// All other primary actions use navy (#1E3A5F).
const P = {
  navy:    '#1E3A5F',
  red:     '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
  text:    '#111827',
  sub:     '#6B7280',
  cardBg:  '#FFFFFF',
  bg:      '#F3F4F6',
};

const SOS_BUTTON_SIZE = 220;
const RING_SIZE = SOS_BUTTON_SIZE + 20;

function helperPinColor(distanceAway?: number) {
  if (distanceAway === undefined) return P.warning;
  return distanceAway < 150 ? P.success : P.warning;
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
    timeLabel,
    triggerSOS,
    cancelSOS,
    assignedRouteCoords,
  } = useVictimSOS();

  // PIN modal state
  const [showPinModal, setShowPinModal]   = useState(false);
  const [pinInput, setPinInput]           = useState('');

  // Video confirmation modal state
  const [showVideoCheck, setShowVideoCheck] = useState(false);

  // Pulse animation refs
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;

  // Navigate to SOSActive screen when SOS starts
  useEffect(() => {
    if (isSearching) {
      navigation.navigate('SOSActive');
    }
  }, [isSearching]);

  // Idle pulse — only when not searching
  useEffect(() => {
    if (isSearching) return;

    const bp = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim,    { toValue: 1.06, duration: 900,  useNativeDriver: true }),
      Animated.timing(pulseAnim,    { toValue: 1,    duration: 900,  useNativeDriver: true }),
    ]));
    const r1 = Animated.loop(Animated.parallel([
      Animated.timing(ring1Scale,   { toValue: 1.8,  duration: 1800, useNativeDriver: true }),
      Animated.timing(ring1Opacity, { toValue: 0,    duration: 1800, useNativeDriver: true }),
    ]));
    const r2 = Animated.loop(Animated.sequence([
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(ring2Scale,   { toValue: 1.8, duration: 1800, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0,   duration: 1800, useNativeDriver: true }),
      ]),
    ]));

    bp.start(); r1.start(); r2.start();
    return () => {
      bp.stop(); r1.stop(); r2.stop();
      pulseAnim.setValue(1);
      ring1Scale.setValue(1);   ring1Opacity.setValue(0.6);
      ring2Scale.setValue(1);   ring2Opacity.setValue(0.4);
    };
  }, [isSearching]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleVerifyPin = () => {
    if (pinInput === '1234') {
      cancelSOS();
      setShowPinModal(false);
      setPinInput('');
    } else {
      Alert.alert('Invalid PIN', 'Please enter the correct security code.');
    }
  };

  const finalizeSOS = () => {
    cancelSOS();
    setShowVideoCheck(false);
    Alert.alert('SOS Complete', 'Safety confirmed via video.');
  };

  const onPressSOS = async () => {
    if (!currentLocation) {
      Alert.alert('Location not ready', 'Wait until your live location is available.');
      return;
    }
    await triggerSOS();
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.spinnerWrapper}>
          <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
        <Text style={styles.loadingTitle}>SafeGuard</Text>
        <Text style={styles.loadingText}>Acquiring GPS...</Text>
        <Text style={styles.loadingSubtext}>Please hold your device steady for a faster lock.</Text>
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
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{ ...currentLocation, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
        >
          {/* Victim pin */}
          <Marker coordinate={currentLocation} pinColor={P.red} title="You" description="Your location" />

          {/* Search radius */}
          {searchRadius > 0 && (
            <Circle center={currentLocation} radius={searchRadius}
              strokeWidth={2} strokeColor="rgba(30,58,95,0.35)" fillColor="rgba(30,58,95,0.07)" />
          )}

          {/* One polyline + one marker per helper — no duplicates */}
          {helpers.map(h => (
            <React.Fragment key={h.userId}>
              <Polyline
                coordinates={[currentLocation, { latitude: h.latitude, longitude: h.longitude }]}
                strokeColor={helperPinColor(h.distanceMeters)}
                strokeWidth={2}
                lineDashPattern={[5, 5]}
              />
              <Marker
                coordinate={{ latitude: h.latitude, longitude: h.longitude }}
                pinColor={helperPinColor(h.distanceMeters)}
                title={h.name}
                description={h.distanceMeters !== undefined ? `${Math.round(h.distanceMeters)}m away` : 'Helper nearby'}
              />
            </React.Fragment>
          ))}

          {/* Route polyline from VictimSOSContext (road-accurate) */}
          {assignedRouteCoords && assignedRouteCoords.length > 1 && (
            <Polyline coordinates={assignedRouteCoords} strokeColor={P.navy} strokeWidth={4} />
          )}
        </MapView>
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>SafeGuard</Text>
          <View style={styles.liveChip}>
            <View style={[styles.connDot, { backgroundColor: isConnected ? P.success : P.sub }]} />
            <Text style={styles.liveText}>{isConnected ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>

        {/* Location card */}
        <View style={styles.locationCard}>
          <View style={styles.iconBox}>
            <MapPin color={P.navy} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{isSearching ? 'SOS STATUS' : 'CURRENT LOCATION'}</Text>
            <Text style={styles.cardMainText}>
              {isSearching ? statusMessage : (currentLocation
                ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`
                : 'Locating...')}
            </Text>
            {timeLabel ? <Text style={styles.cardSubText}>{timeLabel}</Text> : null}
          </View>
        </View>

        {/* ── IDLE: SOS button ── */}
        {!isSearching && (
          <View style={styles.sosCenter} pointerEvents="box-none">
            <Animated.View style={[styles.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} pointerEvents="none" />
            <Animated.View style={[styles.ring, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} pointerEvents="none" />
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity onPress={onPressSOS} style={styles.bigSosButton} activeOpacity={0.85}>
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* ── ACTIVE: helper scroll + action card ── */}
        {isSearching && (
          <View style={styles.activeOverlay}>

            {/* Horizontal helper cards */}
            {helpers.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.helperScroll}>
                {helpers.map(h => (
                  <View key={h.userId} style={styles.helperCard}>
                    <User color={P.sub} size={18} />
                    <Text style={styles.helperName}>{h.name}</Text>
                    <Text style={styles.helperDist}>
                      {h.distanceMeters !== undefined ? `${Math.round(h.distanceMeters)}m` : ''}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.activeContent}>
              <Text style={styles.sosActiveTitle}>🚨 SOS ACTIVE</Text>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.redHalfBtn}
                  onPress={() => Alert.alert('Emergency', 'Calling 911...')}>
                  <Phone color="#FFF" size={18} />
                  <Text style={styles.whiteBtnText}>911</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.greyHalfBtn}
                  onPress={() => setShowPinModal(true)}>
                  <X color={P.sub} size={18} />
                  <Text style={styles.greyBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.navyFullBtn}
                onPress={() => setShowVideoCheck(true)}>
                <ShieldCheck color="#FFF" size={18} />
                <Text style={styles.whiteBtnText}>I Am Safe</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── PIN modal ── */}
        {showPinModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Lock color={P.navy} size={40} />
              <Text style={styles.modalTitle}>Enter Security PIN</Text>
              <TextInput
                style={styles.pinInput}
                secureTextEntry keyboardType="numeric" maxLength={4}
                onChangeText={setPinInput} autoFocus placeholder="••••"
                placeholderTextColor="#D1D5DB"
              />
              <TouchableOpacity style={styles.vBtn} onPress={handleVerifyPin}>
                <Text style={styles.vBtnText}>Verify & Cancel SOS</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPinModal(false)} style={{ marginTop: 15 }}>
                <Text style={{ color: P.sub, fontWeight: '600' }}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Video confirmation modal ── */}
        {showVideoCheck && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Video color={P.navy} size={40} />
              <Text style={styles.modalTitle}>Safety Confirmation</Text>
              <Text style={styles.vSub}>Please record a video to confirm you are safe.</Text>
              <TouchableOpacity style={styles.vBtn} onPress={finalizeSOS}>
                <Text style={styles.vBtnText}>Start Recording</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Bottom tab bar (idle only) ── */}
        {!isSearching && (
          <View style={styles.tabBar} pointerEvents="box-none">
            <TouchableOpacity style={styles.tabBtn} onPress={() => {}}>
              <View style={styles.tabActiveIndicator} />
              <Home color={P.navy} size={22} />
              <Text style={[styles.tabLabel, { color: P.navy, fontWeight: '800' }]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => navigation.navigate('SOSHistory')}>
              <Clock color={P.sub} size={22} />
              <Text style={styles.tabLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => navigation.navigate('EmergencyContacts')}>
              <Users color={P.sub} size={22} />
              <Text style={styles.tabLabel}>Contacts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => navigation.navigate('SettingsHome')}>
              <User color={P.sub} size={22} />
              <Text style={styles.tabLabel}>Profile</Text>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenBg: { flex: 1, backgroundColor: '#F3F4F6' },
  overlay:      { flex: 1, alignItems: 'center' },

  // Loading
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 20 },
  spinnerWrapper:   { backgroundColor: 'rgba(14,165,233,0.15)', padding: 24, borderRadius: 50, marginBottom: 24 },
  loadingTitle:     { color: '#F9FAFB', fontSize: 28, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  loadingText:      { color: '#93C5FD', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  loadingSubtext:   { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },

  // Error
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 24 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#DC2626', marginBottom: 8 },
  errorText:  { color: '#6B7280', textAlign: 'center' },

  // Header
  header: { marginTop: Platform.OS === 'ios' ? 8 : 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '90%' },
  logo:    { fontSize: 28, fontWeight: '900', color: '#111827' },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)', elevation: 3 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { color: '#374151', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },

  // Location card
  locationCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 18, borderRadius: 24, width: '90%', alignItems: 'center', elevation: 8, marginTop: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 } },
  iconBox:      { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardLabel:    { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },
  cardMainText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSubText:  { marginTop: 4, fontSize: 12, color: '#6B7280' },

  // SOS button
  sosCenter: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  ring: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, backgroundColor: 'rgba(220,38,38,0.2)' },
  bigSosButton: { width: SOS_BUTTON_SIZE, height: SOS_BUTTON_SIZE, borderRadius: SOS_BUTTON_SIZE / 2, backgroundColor: '#DC2626', borderWidth: 10, borderColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
  sosText: { color: '#FFF', fontSize: 64, fontWeight: '900' },

  // Active SOS
  activeOverlay: { position: 'absolute', bottom: 100, width: '90%' },
  helperScroll:  { marginBottom: 12, maxHeight: 70 },
  helperCard:    { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, marginRight: 12, elevation: 4, gap: 8 },
  helperName:    { fontWeight: '700', fontSize: 13, color: '#1F2937' },
  helperDist:    { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  activeContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 24, alignItems: 'center', elevation: 15 },
  sosActiveTitle: { fontSize: 18, fontWeight: '900', color: '#DC2626', marginBottom: 14 },

  btnRow:      { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10, gap: 10 },
  redHalfBtn:  { flex: 1, flexDirection: 'row', backgroundColor: '#DC2626', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 6 },
  greyHalfBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#E5E7EB', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 6 },
  navyFullBtn: { flexDirection: 'row', backgroundColor: '#1E3A5F', width: '100%', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  whiteBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  greyBtnText:  { color: '#4B5563', fontWeight: '900', fontSize: 14 },

  // Modals
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#FFF', width: '85%', padding: 30, borderRadius: 30, alignItems: 'center' },
  modalTitle:   { fontSize: 22, fontWeight: '900', marginTop: 15, color: '#111827' },
  vSub:         { textAlign: 'center', color: '#4B5563', marginVertical: 15 },
  pinInput:     { backgroundColor: '#F3F4F6', width: '100%', height: 60, borderRadius: 15, textAlign: 'center', fontSize: 28, fontWeight: 'bold', marginVertical: 20, color: '#111827' },
  vBtn:         { backgroundColor: '#1E3A5F', width: '100%', padding: 18, borderRadius: 16, alignItems: 'center' },
  vBtnText:     { color: '#FFF', fontWeight: '900' },

  // Bottom tab bar
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: Platform.OS === 'ios' ? 28 : 12, paddingTop: 10, elevation: 20 },
  tabBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative' },
  tabActiveIndicator: { position: 'absolute', top: -10, width: 28, height: 3, borderRadius: 2, backgroundColor: '#1E3A5F' },
  tabLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
});
