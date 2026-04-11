import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, User, Users, Phone, X, ShieldCheck, Video } from "lucide-react-native";
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
  Alert,
  ScrollView,
  Linking
} from "react-native";
// @ts-ignore
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

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

  // --- STATE MANAGEMENT ---
  const USER_LOCATION = { latitude: 33.4150, longitude: -111.9085 };
  const [helpers, setHelpers] = useState<Helper[]>([]); 
  const [searchRadius, setSearchRadius] = useState<number>(0); 
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [timerCount, setTimerCount] = useState<number>(0);
  const [showVideoCheck, setShowVideoCheck] = useState(false); 
  const timerRef = useRef<any>(null);

  // --- ENGINE 1: MOVEMENT & ETA TRACKING ---
  useEffect(() => {
    if (helpers.length === 0) return;
    const moveInterval = setInterval(() => {
      setHelpers((prevHelpers) =>
        prevHelpers.map((h) => {
          const newLat = h.latitude + (USER_LOCATION.latitude - h.latitude) * 0.015;
          const newLng = h.longitude + (USER_LOCATION.longitude - h.longitude) * 0.015;
          const dist = Math.sqrt(Math.pow(newLat - USER_LOCATION.latitude, 2) + Math.pow(newLng - USER_LOCATION.longitude, 2));
          const metersAway = Math.round(dist * 111320);
          return { ...h, latitude: newLat, longitude: newLng, distanceAway: metersAway };
        })
      );
    }, 3000);
    return () => clearInterval(moveInterval);
  }, [helpers.length]); 

  // --- ENGINE 2: RADIUS SEARCH LOGIC ---
  useEffect(() => {
    if (!isSearching) return;
    timerRef.current = setInterval(() => {
      setTimerCount((prev) => {
        if (prev === 0 || prev === 29) {
          const rad = prev === 0 ? 250 : 500;
          findNearestHelpers(USER_LOCATION.latitude, USER_LOCATION.longitude, rad).then(res => {
            if (res.helpers) setHelpers(prevH => [...prevH, ...res.helpers]);
            if (prev === 29) setSearchRadius(500); 
          });
        }
        return prev >= 30 ? 30 : prev + 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSearching]);

  // --- IDLE ANIMATIONS ---
  useEffect(() => {
    const loop = (a: any, v: number) => Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: v, duration: 1000, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 1000, useNativeDriver: true })
    ])).start();
    loop(pulseAnim, 1.05);
  }, []);

  // --- BUTTON ACTIONS ---
  const handleTriggerSOS = () => {
    console.log("TASK 1: Notifying Emergency Contacts..."); 
    setHelpers([]);
    setTimerCount(0);
    setSearchRadius(250);
    setIsSearching(true);
  };

  const handleCancelWithPin = () => {
    Alert.prompt("Security Check", "Enter 4-digit PIN to cancel SOS", [
      { text: "Back", style: "cancel" },
      { text: "Confirm", onPress: (pin: any) => {
          if (pin === "1234") {
            setIsSearching(false);
            setSearchRadius(0);
            setHelpers([]);
            setTimerCount(0);
          } else { Alert.alert("Invalid PIN"); }
      }}
    ], "secure-text");
  };

  const finalizeSOS = () => {
    setIsSearching(false);
    setSearchRadius(0);
    setHelpers([]);
    setTimerCount(0);
    setShowVideoCheck(false);
    Alert.alert("SOS Complete", "Safety confirmed via video.");
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
          <Circle center={USER_LOCATION} radius={searchRadius} strokeWidth={2} strokeColor="rgba(220, 38, 38, 0.5)" fillColor="rgba(220, 38, 38, 0.1)" />
        )}
        
        {helpers.map((h) => (
          <React.Fragment key={h.id}>
            {/* @ts-ignore */}
            <Polyline coordinates={[USER_LOCATION, { latitude: h.latitude, longitude: h.longitude }]} strokeColor="#10B981" strokeWidth={2} lineDashPattern={[5, 5]} />
            {/* @ts-ignore */}
            <Marker coordinate={{ latitude: h.latitude, longitude: h.longitude }}>
               <View style={styles.etaBadge}><Text style={styles.etaText}>{h.distanceAway}m</Text></View>
               <MapPin color="#10B981" size={30} fill="#10B981" />
            </Marker>
          </React.Fragment>
        ))}
      </MapView>

      <SafeAreaView style={styles.container} pointerEvents="box-none">
        <View style={styles.header}><Text style={styles.logo}>SafeGuard</Text></View>

        <View style={styles.locationCard}>
          <View style={styles.iconBox}><MapPin color="#DC2626" size={18} /></View>
          <View>
            <Text style={styles.cardLabel}>{isSearching ? `EXPANDING IN ${30 - timerCount}s` : "CURRENT LOCATION"}</Text>
            <Text style={styles.cardMainText}>1831 E, Apache Blvd</Text>
          </View>
        </View>

        {!isSearching ? (
          <View style={styles.buttonCenter} pointerEvents="box-none">
            <TouchableOpacity onPress={handleTriggerSOS} style={styles.bigSosButton}>
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeOverlay}>
            {helpers.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.helperScroll}>
                {helpers.map(helper => (
                  <View key={helper.id} style={styles.helperCard}>
                    <User color="#4B5563" size={18} /><Text style={styles.helperName}>{helper.name}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('tel:911')}><Phone color="#16A34A" size={18} /></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.activeContent}>
              <Text style={styles.sosActiveTitle}>🚨 SOS ACTIVE</Text>
              
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.redHalfBtn} onPress={() => Alert.alert("Emergency", "Calling 911...")}>
                  <Phone color="#FFF" size={20} /><Text style={styles.whiteBtnText}>911</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.greyHalfBtn} onPress={handleCancelWithPin}>
                  <X color="#4B5563" size={20} /><Text style={styles.greyBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.blueFullBtn} onPress={() => setShowVideoCheck(true)}>
                <ShieldCheck color="#FFF" size={20} /><Text style={styles.whiteBtnText}>I Am Safe (Video Recording)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showVideoCheck && (
          <View style={styles.videoModal}>
            <View style={styles.videoContent}>
              <Video color="#DC2626" size={40} />
              <Text style={styles.vTitle}>Safety Confirmation</Text>
              <Text style={styles.vSub}>Please record a 5-second video to confirm you are safe.</Text>
              <TouchableOpacity style={styles.vBtn} onPress={finalizeSOS}><Text style={styles.vBtnText}>Start Recording</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* PERMANENT BOTTOM BUTTONS */}
        <View style={styles.bottomButtonsContainer} pointerEvents="box-none">
          <TouchableOpacity style={styles.bottomBtn} onPress={() => navigation.navigate('EmergencyContacts')}>
            <Users color="#4B5563" size={24} /><Text style={styles.bottomBtnText}>Emergency{"\n"}Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomBtn} onPress={() => navigation.navigate('SettingsHome')}>
            <User color="#4B5563" size={24} /><Text style={styles.bottomBtnText}>User{"\n"}Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenBg: { flex: 1 },
  container: { flex: 1, alignItems: 'center' },
  header: { marginTop: Platform.OS === 'ios' ? 40 : 50 },
  logo: { fontSize: 28, fontWeight: '900', color: '#111827' },
  locationCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 18, borderRadius: 20, width: '90%', alignItems: 'center', elevation: 8, marginTop: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 } },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },
  cardMainText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  buttonCenter: { position: 'absolute', top: '38%' },
  bigSosButton: { width: 230, height: 230, borderRadius: 115, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', elevation: 12 },
  sosText: { color: '#FFF', fontSize: 68, fontWeight: '900' },
  activeOverlay: { position: 'absolute', bottom: 140, width: '90%' },
  activeContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 24, alignItems: 'center', elevation: 15 },
  sosActiveTitle: { fontSize: 20, fontWeight: '900', color: '#DC2626', marginBottom: 15 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  redHalfBtn: { flex: 0.48, flexDirection: 'row', backgroundColor: '#FF0000', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  greyHalfBtn: { flex: 0.48, flexDirection: 'row', backgroundColor: '#E5E7EB', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  blueFullBtn: { flexDirection: 'row', backgroundColor: '#2563EB', width: '100%', padding: 15, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  whiteBtnText: { color: '#FFF', fontWeight: '900', marginLeft: 8 },
  greyBtnText: { color: '#4B5563', fontWeight: '900', marginLeft: 8 },
  bottomButtonsContainer: { position: 'absolute', bottom: 30, flexDirection: 'row', width: '100%', paddingHorizontal: 20 },
  bottomBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 18, padding: 15, marginHorizontal: 5, alignItems: 'center', elevation: 4 },
  bottomBtnText: { color: '#374151', fontSize: 12, fontWeight: '700', marginLeft: 10 },
  etaBadge: { backgroundColor: '#FFF', paddingHorizontal: 4, borderRadius: 5, position: 'absolute', top: -20, alignSelf: 'center', borderWidth: 1, borderColor: '#10B981' },
  etaText: { fontSize: 10, color: '#10B981', fontWeight: 'bold' },
  helperScroll: { marginBottom: 15, maxHeight: 70 },
  helperCard: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, marginRight: 12, elevation: 5 },
  helperName: { marginHorizontal: 10, fontWeight: 'bold', fontSize: 13, color: '#1F2937' },
  videoModal: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  videoContent: { backgroundColor: '#FFF', width: '85%', padding: 30, borderRadius: 30, alignItems: 'center' },
  vTitle: { fontSize: 20, fontWeight: '900', marginTop: 15, color: '#111827' },
  vSub: { textAlign: 'center', color: '#4B5563', marginVertical: 15 },
  vBtn: { backgroundColor: '#DC2626', width: '100%', padding: 18, borderRadius: 16, alignItems: 'center' },
  vBtnText: { color: '#FFF', fontWeight: '900' }
});