import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, User, Users } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { USER_LOCATION } from '../../services/sosService';

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function MainDashboard({ navigation }: MainDashboardProps) {
  // Pulse + ring animation refs
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
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
  }, []);

  const handleSOS = () => {
    navigation.navigate('SOSActiveScreen');
  };

  return (
    <View style={styles.fullScreenBg}>

      {/* Map — idle view, slightly offset so pin appears above SOS button */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude:       USER_LOCATION.latitude + 0.006,
          longitude:      USER_LOCATION.longitude,
          latitudeDelta:  0.025,
          longitudeDelta: 0.025,
        }}
      >
        <Marker
          coordinate={USER_LOCATION}
          pinColor="#DC2626"
          title="YOU"
          description="Your current location"
        />
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>SafeGuard</Text>
        </View>

        {/* Location card */}
        <View style={styles.locationCard}>
          <View style={styles.iconBox}>
            <MapPin color="#DC2626" size={18} />
          </View>
          <View>
            <Text style={styles.cardLabel}>CURRENT LOCATION</Text>
            <Text style={styles.cardMainText}>1831 E, Apache Blvd</Text>
          </View>
        </View>

        {/* SOS button with pulse rings — centred absolutely */}
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
            <TouchableOpacity onPress={handleSOS} style={styles.bigSosButton} activeOpacity={0.85}>
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Bottom nav */}
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

  bottomButtonsContainer: {
    position: 'absolute', bottom: 40,
    flexDirection: 'row', width: '100%', paddingHorizontal: 24,
  },
  bottomBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: '#FFF',
    borderRadius: 18, padding: 16, marginHorizontal: 8, alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
  },
  bottomBtnText: { color: '#374151', fontSize: 13, fontWeight: '700', marginLeft: 10 },
});