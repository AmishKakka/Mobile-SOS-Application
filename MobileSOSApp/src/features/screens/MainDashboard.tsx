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
  // --- ORIGINAL ANIMATIONS ---
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;

  // --- STATE (FIXED FOR SOS LOGIC) ---
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

  // --- ENGINE 2: RANDOM POPS & EXPANSION ---
  useEffect(() => {
    if (!isSearching) return;

    // A. 30s Physical Expansion Timer
    const expansionTimer = setInterval(() => {
      setTimerCount((prev) => {
        if (prev >= 29) {
          setSearchRadius(current => current + 250); // GROW THE CIRCLE VISUALLY
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    // B. Random Helper Arrival (One by One)
    const spawner = setInterval(async () => {
      // 40% chance every 4s to find a volunteer
      if (helpers.length < 5 && Math.random() > 0.6) {
        const result = await findNearestHelpers(USER_LOCATION.latitude, USER_LOCATION.longitude, searchRadius);
        if (result.helpers && result.helpers.length > 0) {
          const newH = result.helpers[0];
          setHelpers(prev => {
            if (prev.find(h => h.id === newH.id)) return prev;
            return [...prev, newH];
          });
        }
      }
    }, 4000);

    return () => {
      clearInterval(expansionTimer);
      clearInterval(spawner);
    };
  }, [isSearching, searchRadius, helpers.length]);

  // --- BUTTON ANIMATIONS ---
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
  };

  return (
    <View style={styles.fullScreenBg}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: USER_LOCATION.latitude,
          longitude: USER_LOCATION.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
      >
        <Marker coordinate={USER_LOCATION} title="Victim" pinColor="#DC2626" />
        {searchRadius > 0 && (
          <Circle
            center={USER_LOCATION}
            radius={searchRadius}
            strokeWidth={2}
            strokeColor="rgba(220, 38, 38, 0.5)"
            fillColor="rgba(220, 38, 38, 0.1)"
          />
        )}
        {helpers.map(helper => (
          <Marker 
            key={helper.id} 
            coordinate={{ latitude: helper.latitude, longitude: helper.longitude }}
            title={helper.name}
            pinColor="#10B981"
          />
        ))}
      </MapView>

      <SafeAreaView style={styles.transparentSafe} pointerEvents="box-none">
        <View style={styles.headerLite}><Text style={styles.screenTitleCentered}>SafeGuard</Text></View>
        <View style={styles.locationCard}>
          <View style={styles.locationIconBox}><MapPin color="#DC2626" size={18} /></View>
          <View>
            <Text style={styles.locationLabel}>
               {isSearching ? `EXPANDING IN ${30 - timerCount}s` : "CURRENT LOCATION"}
            </Text>
            <Text style={styles.locationText}>1831 E, Apache Blvd</Text>
          </View>
        </View>

        <View style={styles.idleButtonWrapper} pointerEvents="box-none">
          {!isSearching ? (
             <TouchableOpacity activeOpacity={0.9} onPress={handleTriggerSOS} style={styles.sosButton}>
                <Text style={styles.sosButtonTextMain}>SOS</Text>
                <Text style={styles.sosButtonTextSub}>PRESS IN EMERGENCY</Text>
             </TouchableOpacity>
          ) : (
            <View style={styles.activeStatusBox}>
               <ActivityIndicator color="#DC2626" size="large" />
               <Text style={styles.activeText}>Searching {searchRadius}m...</Text>
               <TouchableOpacity onPress={cancelSOS} style={styles.cancelLink}>
                  <Text style={styles.cancelLinkText}>Cancel SOS</Text>
               </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenBg: { flex: 1 },
  transparentSafe: { flex: 1, alignItems: 'center' },
  headerLite: { marginTop: 50 },
  screenTitleCentered: { fontSize: 28, fontWeight: '900', color: '#111827' },
  locationCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 16, width: '88%', alignItems: 'center', elevation: 5, marginTop: 10 },
  locationIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  locationLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF' },
  locationText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  idleButtonWrapper: { position: 'absolute', top: '38%', alignItems: 'center' },
  sosButton: { width: 230, height: 230, borderRadius: 115, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  sosButtonTextMain: { color: '#FFF', fontSize: 68, fontWeight: '900' },
  sosButtonTextSub: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  activeStatusBox: { backgroundColor: '#FFF', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 10 },
  activeText: { color: '#DC2626', fontWeight: '900', fontSize: 18, marginTop: 10 },
  cancelLink: { marginTop: 15 },
  cancelLinkText: { color: '#6B7280', fontWeight: '700', textDecorationLine: 'underline' }
});