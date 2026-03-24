import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, User, Users } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker } from 'react-native-maps';

const { width } = Dimensions.get('window');

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function MainDashboard({ navigation }: MainDashboardProps) {
  // Animation Values for the Idle Button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;

  // ASU Tempe Coordinates for testing
  const USER_LOCATION = { latitude: 33.4150, longitude: -111.9085 };

  // Task 49: State to hold incoming helpers
  const [helpers, setHelpers] = useState([
    { id: '1', latitude: 33.4170, longitude: -111.9120 }, 
    { id: '2', latitude: 33.4120, longitude: -111.9050 },
    { id: '3', latitude: 33.4185, longitude: -111.9060 }
  ]);

  // Continuous Pulse Animation for the idle SOS button
  useEffect(() => {
    const createLoop = (anim: Animated.Value, toValue: number, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true })
        ])
      );
    };

    const ringLoop = (anim: Animated.Value, toValue: number, duration: number) => {
      return Animated.loop(
        Animated.timing(anim, { toValue, duration, useNativeDriver: true })
      );
    };

    Animated.parallel([
      createLoop(pulseAnim, 1.05, 1000),
      ringLoop(ring1Anim, 1.5, 2000),
      ringLoop(ring2Anim, 2, 2000),
    ]).start();
  }, []);

  const handleTriggerSOS = () => {
    navigation.navigate('EmergencySearch');
  };

  return (
    <View style={styles.fullScreenBg}>
      
      {/* TASK 49: Live Map Background */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: USER_LOCATION.latitude,
          longitude: USER_LOCATION.longitude,
          latitudeDelta: 0.03, // Controls zoom level
          longitudeDelta: 0.03,
        }}
      >
        {/* The Victim's Location */}
        <Marker 
          coordinate={USER_LOCATION} 
          title="You are here" 
          pinColor="#DC2626" // Red pin
        />

        {/* The Incoming Helpers */}
        {helpers.map(helper => (
          <Marker 
            key={helper.id} 
            coordinate={{ latitude: helper.latitude, longitude: helper.longitude }}
            title="SafeGuard Helper"
            pinColor="#10B981" // Green pin
          />
        ))}
      </MapView>

      {/* pointerEvents="box-none" lets you touch the map through the invisible parts of the safe area! */}
      <SafeAreaView style={styles.transparentSafe} pointerEvents="box-none">

        {/* Header */}
        <View style={styles.headerLite}>
          <Text style={styles.screenTitleCentered}>SafeGuard</Text>
        </View>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconBox}>
            <MapPin color="#DC2626" size={18} />
          </View>
          <View>
            <Text style={styles.locationLabel}>CURRENT LOCATION</Text>
            <Text style={styles.locationText}>1831 E, Apache Blvd</Text>
          </View>
        </View>

        {/* Main SOS Button & Pulse Rings */}
        <View style={styles.idleButtonWrapper} pointerEvents="box-none">
          {/* Outer Pulsing Rings */}
          <Animated.View style={[
            styles.ring,
            {
              transform: [{ scale: ring1Anim }],
              opacity: ring1Anim.interpolate({ inputRange: [1, 1.5], outputRange: [0.5, 0] })
            }
          ]} />
          <Animated.View style={[
            styles.ring,
            {
              transform: [{ scale: ring2Anim }],
              opacity: ring2Anim.interpolate({ inputRange: [1, 2], outputRange: [0.3, 0] })
            }
          ]} />

          {/* The SOS Button itself */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTriggerSOS}
              style={styles.sosButton}
            >
              <Text style={styles.sosButtonTextMain}>SOS</Text>
              <Text style={styles.sosButtonTextSub}>PRESS IN EMERGENCY</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Bottom Navigation Row */}
        <View style={styles.bottomButtonsContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => navigation.navigate('EmergencyContacts')}
          >
            <View style={styles.btnIconBoxWrapper}>
              <Users color="#4B5563" size={24} />
            </View>
            <Text style={styles.bottomBtnText}>Emergency{'\n'}Contacts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => navigation.navigate('SettingsHome')}
          >
            <View style={styles.btnIconBoxWrapper}>
              <User color="#4B5563" size={24} />
            </View>
            <Text style={styles.bottomBtnText}>User{'\n'}Profile</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenBg: { flex: 1, width: '100%', height: '100%' },
  transparentSafe: { flex: 1, alignItems: 'center', backgroundColor: 'transparent' },

  // Header
  headerLite: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 50 : 20,
    paddingBottom: 16
  },
  screenTitleCentered: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5
  },

  // Location Card
  locationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 16,
    width: '88%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    marginTop: 10
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 2
  },
  locationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
  },

  // SOS Button UI
  idleButtonWrapper: {
    position: 'absolute',
    top: '38%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ring: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: '#DC2626'
  },
  sosButton: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20
  },
  sosButtonTextMain: {
    color: '#FFF',
    fontSize: 68,
    fontWeight: '900',
    letterSpacing: 2
  },
  sosButtonTextSub: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: -5,
    letterSpacing: 0.5,
    opacity: 0.9
  },

  // Bottom Buttons
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 24
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 8,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  btnIconBoxWrapper: { marginRight: 12 },
  bottomBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18
  },
});