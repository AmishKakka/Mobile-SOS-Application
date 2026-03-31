import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, User, Users, Phone, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert
} from "react-native";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

// Import the service logic
import { findNearestHelpers, Helper } from '../../services/helperService';

const { width } = Dimensions.get('window');

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function MainDashboard({ navigation }: MainDashboardProps) {
  // --- ANIMATION REFS (Original) ---
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;

  // --- STATE ---
  const USER_LOCATION = { latitude: 33.4150, longitude: -111.9085 };
  const [helpers, setHelpers] = useState<Helper[]>([]); 
  const [searchRadius, setSearchRadius] = useState<number>(0); 
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [timerCount, setTimerCount] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // --- ENGINE 1: MOVEMENT (Live Tracker) ---
  useEffect(() => {
    if (helpers.length === 0) return;
    const moveInterval = setInterval(() => {
      setHelpers((prevHelpers) =>
        prevHelpers.map((h) => ({
          ...h,
          latitude: h.latitude + (USER_LOCATION.latitude - h.latitude) * 0.015,
          longitude: h.longitude + (USER_LOCATION.longitude - h.longitude) * 0.015,
        }))
      );
    }, 3000);
    return () => clearInterval(moveInterval);
  }, [helpers.length]); 

  // --- ENGINE 2: RADIUS & SEARCHING LOGIC ---
  useEffect(() => {
    if (!isSearching) return;

    timerRef.current = setInterval(() => {
      setTimerCount((prev) => {
        if (prev >= 29) {
          // Visual Expansion after 30 seconds
          setSearchRadius(500); 
          return 30; 
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSearching]);

  // --- IDLE ANIMATIONS ---
  useEffect(() => {
    const loop = (a: any, v: number) => Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: v, duration: 1000, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 1000, useNativeDriver: true })
    ])).start();
    loop(pulseAnim, 1.05);
  }, []);

  // --- ACTIONS ---
  const handleTriggerSOS = () => {
    setHelpers([]);
    setTimerCount(0);
    setSearchRadius(250);
    setIsSearching(true);
  };

  const cancelSOS = () => {
    setIsSearching(false);
    setSearchRadius(0);
    setHelpers([]);
    setTimerCount(0);
  };

  return (
    <View style={styles.fullScreenBg}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{ ...USER_LOCATION, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
      >
        <Marker coordinate={USER_LOCATION} pinColor="#DC2626" title="My Location" />
        {searchRadius > 0 && (
          <Circle 
            center={USER_LOCATION} 
            radius={searchRadius} 
            strokeWidth={2} 
            strokeColor="rgba(220, 38, 38, 0.5)" 
            fillColor="rgba(220, 38, 38, 0.1)" 
          />
        )}
        {helpers.map(h => (
          <Marker key={h.id} coordinate={{ latitude: h.latitude, longitude: h.longitude }} pinColor="#10B981" />
        ))}
      </MapView>

      <SafeAreaView style={styles.container} pointerEvents="box-none">
        <View style={styles.header}><Text style={styles.logo}>SafeGuard</Text></View>

        {/* --- DYNAMIC ADDRESS BAR --- */}
        <View style={styles.locationCard}>
          <View style={styles.iconBox}><MapPin color="#DC2626" size={18} /></View>
          <View>
            <Text style={styles.cardLabel}>{isSearching ? "SOS STATUS" : "CURRENT LOCATION"}</Text>
            <Text style={styles.cardMainText}>
              {!isSearching 
                ? "1831 E, Apache Blvd" 
                : (timerCount < 30 ? "Searching for helpers..." : "Radius Expanded to 500m!")}
            </Text>
          </View>
        </View>

        {/* --- DYNAMIC UI SWITCH --- */}
        {!isSearching ? (
          <View style={styles.buttonCenter} pointerEvents="box-none">
            <TouchableOpacity onPress={handleTriggerSOS} style={styles.bigSosButton}>
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* SEARCHING OVERLAY: Call 911 & Grey Cancel Button */
          <View style={styles.activeOverlay}>
            <View style={styles.activeContent}>
              <Text style={styles.sosActiveTitle}>🚨 SOS ACTIVE</Text>
              <Text style={styles.searchingCountdown}>
                {timerCount < 30 ? `Expanding in ${30 - timerCount}s...` : "Radius Expanded"}
              </Text>
              
              <TouchableOpacity style={styles.call911Button} onPress={() => Alert.alert("Emergency", "Calling 911...")}>
                <Phone color="#FFF" size={24} />
                <Text style={styles.call911Text}>CALL 911 NOW</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.greyCancelButton} onPress={cancelSOS}>
                <X color="#4B5563" size={18} />
                <Text style={styles.cancelButtonText}>Cancel SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isSearching && (
          <View style={styles.bottomButtonsContainer} pointerEvents="box-none">
            <TouchableOpacity style={styles.bottomBtn} onPress={() => navigation.navigate('EmergencyContacts')}>
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

const styles = StyleSheet.create({
  fullScreenBg: { flex: 1 },
  container: { flex: 1, alignItems: 'center' },
  header: { marginTop: Platform.OS === 'ios' ? 40 : 50 },
  logo: { fontSize: 28, fontWeight: '900', color: '#111827' },
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
    shadowOffset: { width: 0, height: 4 }
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },
  cardMainText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  buttonCenter: { position: 'absolute', top: '38%' },
  bigSosButton: { width: 230, height: 230, borderRadius: 115, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', elevation: 12 },
  sosText: { color: '#FFF', fontSize: 68, fontWeight: '900' },
  
  // ACTIVE UI STYLES
  activeOverlay: { position: 'absolute', bottom: 40, width: '90%' },
  activeContent: { backgroundColor: '#FFF', padding: 25, borderRadius: 24, alignItems: 'center', elevation: 15 },
  sosActiveTitle: { fontSize: 22, fontWeight: '900', color: '#DC2626' },
  searchingCountdown: { marginVertical: 10, fontWeight: '700', color: '#6B7280', fontSize: 14 },
  call911Button: { flexDirection: 'row', backgroundColor: '#FF0000', width: '100%', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  call911Text: { color: '#FFF', fontWeight: '900', fontSize: 18, marginLeft: 10 },
  greyCancelButton: { flexDirection: 'row', backgroundColor: '#E5E7EB', width: '100%', padding: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  cancelButtonText: { color: '#4B5563', fontWeight: '700', marginLeft: 8 },
  
  bottomButtonsContainer: { position: 'absolute', bottom: 40, flexDirection: 'row', width: '100%', paddingHorizontal: 24 },
  bottomBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginHorizontal: 8, alignItems: 'center', elevation: 4 },
  bottomBtnText: { color: '#374151', fontSize: 13, fontWeight: '700', marginLeft: 10 }
});