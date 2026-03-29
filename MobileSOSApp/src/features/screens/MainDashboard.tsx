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

// Import the service logic and the Helper type we defined earlier
import { findNearestHelpers, Helper } from '../../services/helperService';

const { width } = Dimensions.get('window');

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function MainDashboard({ navigation }: MainDashboardProps) {
  // Animation Values for the Idle Button
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

  // --- TASK 48.5: THE MOVEMENT ENGINE (Live Tracker) ---
  // Only runs when markers are actually present on the map
  useEffect(() => {
    if (helpers.length === 0) return;

    const moveInterval = setInterval(() => {
      setHelpers((prevHelpers) =>
        prevHelpers.map((h) => ({
          ...h,
          latitude: h.latitude + (USER_LOCATION.latitude - h.latitude) * 0.02,
          longitude: h.longitude + (USER_LOCATION.longitude - h.longitude) * 0.02,
        }))
      );
    }, 3000);

    return () => clearInterval(moveInterval);
  }, [helpers.length]); 

  // --- TASK 48: DYNAMIC 30-SECOND EXPANSION TIMER ---
  useEffect(() => {
    // Start timer only if searching and no helpers found yet (Gating)
    if (isSearching && helpers.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimerCount((prev) => {
          if (prev >= 29) { 
            if (timerRef.current) clearInterval(timerRef.current);
            handleExpandSearch(); 
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSearching, helpers.length]);

  // SOS Button Pulse Animation Loop
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
  }, [pulseAnim, ring1Anim, ring2Anim]);

  // --- TRIGGER SOS LOGIC ---
  const handleTriggerSOS = () => {
    setHelpers([]); // Clear markers immediately
    setTimerCount(0); 
    setSearchRadius(250); 
    setIsSearching(true); 
  };

  const handleExpandSearch = async () => {
    const doubledRadius = 500;
    setSearchRadius(doubledRadius);
    
    try {
      const result = await findNearestHelpers(USER_LOCATION.latitude, USER_LOCATION.longitude, doubledRadius);

      if (result.helpers && result.helpers.length > 0) {
        setHelpers(result.helpers); // Now markers pop on map
        setSearchRadius(result.finalRadius);
        setIsSearching(false);
        
        Alert.alert("Search Expanded", "No one found at 250m. Found 5 volunteers within 500m!");

        setTimeout(() => {
          navigation.navigate('EmergencySearch', { 
            foundHelpers: result.helpers, 
            radius: result.finalRadius 
          });
        }, 4000); // 4 seconds of movement before navigating
      } else {
        Alert.alert("Notice", "Expanding search to 1km. Authorities notified.");
        setIsSearching(false);
      }
    } catch (error) {
      console.error("Expansion Error:", error);
      setIsSearching(false);
    }
  };

  return (
    <View style={styles.fullScreenBg}>
      
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: USER_LOCATION.latitude,
          longitude: USER_LOCATION.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        <Marker 
          coordinate={USER_LOCATION} 
          title="You are here" 
          pinColor="#DC2626" 
        />

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
        <View style={styles.headerLite}>
          <Text style={styles.screenTitleCentered}>SafeGuard</Text>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationIconBox}>
            <MapPin color="#DC2626" size={18} />
          </View>
          <View>
            <Text style={styles.locationLabel}>
              {isSearching && helpers.length === 0 
                ? `EXPANDING IN ${30 - timerCount}s` 
                : "CURRENT LOCATION"}
            </Text>
            <Text style={styles.locationText}>1831 E, Apache Blvd</Text>
          </View>
        </View>

        <View style={styles.idleButtonWrapper} pointerEvents="box-none">
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

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTriggerSOS}
              disabled={isSearching}
              style={[styles.sosButton, isSearching && { backgroundColor: '#991B1B' }]}
            >
              {isSearching && helpers.length === 0 ? (
                <View style={{alignItems: 'center'}}>
                  <ActivityIndicator color="#FFF" size="large" />
                  <Text style={{color: '#FFF', fontWeight: '700', marginTop: 10}}>SEARCHING...</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.sosButtonTextMain}>SOS</Text>
                  <Text style={styles.sosButtonTextSub}>PRESS IN EMERGENCY</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

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