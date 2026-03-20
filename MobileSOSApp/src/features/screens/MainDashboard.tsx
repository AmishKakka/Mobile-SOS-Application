import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock, Delete, MapPin, Shield, User, Users } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, ImageBackground, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width } = Dimensions.get('window');

// Local image asset for map background (recommended for offline reliability)
const MAP_BACKGROUND_SOURCE = require('../../../Images/demo-map.jpg');
// Optional remote fallback if needed
const MAP_BACKGROUND_URI = 'https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=1200&q=80';

const getMapBackgroundSource = () => {
  if (MAP_BACKGROUND_SOURCE) {
    return MAP_BACKGROUND_SOURCE;
  }
  return { uri: MAP_BACKGROUND_URI };
};

type MainDashboardProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

type KeypadButtonProps = {
  num?: string;
  onPress: () => void;
  isIcon?: boolean;
};

export default function MainDashboard({ navigation }: MainDashboardProps) {
  const [sosActive, setSosActive] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pin, setPin] = useState("");
  const [secondsActive, setSecondsActive] = useState(0);
  
  const CORRECT_PIN = "1234"; 

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (sosActive && !showPinPrompt) {
      interval = setInterval(() => setSecondsActive(prev => prev + 1), 1000);
    } else if (!sosActive) {
      setSecondsActive(0);
    }
    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [sosActive, showPinPrompt]);

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Animation Logic
  useEffect(() => {
    if (sosActive || !sosActive) { 
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
          ])
        ),
        Animated.loop(Animated.timing(ring1Anim, { toValue: 1.5, duration: 2000, useNativeDriver: true })),
        Animated.loop(Animated.timing(ring2Anim, { toValue: 2, duration: 2000, useNativeDriver: true }))
      ]).start();
    }
  }, [sosActive]);

  const handleTriggerSOS = () => setSosActive(true);
  const handleInitiateCancel = () => setShowPinPrompt(true);

  // Custom Keypad Logic
  const handleKeyPress = (num: string): void => {
    if (pin.length < 4) setPin(pin + num);
  };
  const handleDelete = (): void => {
    setPin(pin.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CORRECT_PIN) {
        setSosActive(false);
        setShowPinPrompt(false);
        setPin("");
      } else {
        setTimeout(() => setPin(""), 300);
      }
    }
  }, [pin]);

  const handleReturnToSOS = () => {
    setShowPinPrompt(false);
    setPin("");
  };

  // Custom Keypad Component
  const KeypadButton = ({ num, onPress, isIcon = false }: KeypadButtonProps): React.ReactNode => (
    <TouchableOpacity style={styles.keypadBtn} onPress={onPress}>
      {isIcon ? <Delete color="#111827" size={28} /> : <Text style={styles.keypadNum}>{num ?? ''}</Text>}
    </TouchableOpacity>
  );

  if (showPinPrompt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pinScreen}>
          <View style={styles.shieldIconContainer}>
            <Shield color="#FFF" size={32} />
          </View>
          <Text style={styles.pinTitle}>Security Verification</Text>
          <Text style={styles.pinSub}>Enter your 4-digit PIN to cancel the emergency alert</Text>
          
          <View style={styles.pinBoxContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View key={`pin-${index}`} style={styles.pinBox}>
                <Text style={styles.pinBoxText}>{pin[index] ? '•' : ''}</Text>
              </View>
            ))}
          </View>

          <View style={styles.keypadContainer}>
            <View style={styles.keypadRow}>
              <KeypadButton num="1" onPress={() => handleKeyPress("1")} />
              <KeypadButton num="2" onPress={() => handleKeyPress("2")} />
              <KeypadButton num="3" onPress={() => handleKeyPress("3")} />
            </View>
            <View style={styles.keypadRow}>
              <KeypadButton num="4" onPress={() => handleKeyPress("4")} />
              <KeypadButton num="5" onPress={() => handleKeyPress("5")} />
              <KeypadButton num="6" onPress={() => handleKeyPress("6")} />
            </View>
            <View style={styles.keypadRow}>
              <KeypadButton num="7" onPress={() => handleKeyPress("7")} />
              <KeypadButton num="8" onPress={() => handleKeyPress("8")} />
              <KeypadButton num="9" onPress={() => handleKeyPress("9")} />
            </View>
            <View style={styles.keypadRow}>
              <View style={[styles.keypadBtn, { backgroundColor: 'transparent', shadowOpacity: 0 }]} />
              <KeypadButton num="0" onPress={() => handleKeyPress("0")} />
              <KeypadButton isIcon onPress={handleDelete} />
            </View>
          </View>

          <TouchableOpacity style={styles.returnButton} onPress={handleReturnToSOS}>
            <Text style={styles.returnButtonText}>Return to SOS</Text>
          </TouchableOpacity>
          <Text style={styles.returnSubtext}>Tapped cancel by mistake? Return to keep the emergency alert active.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sosActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContent}>
          <View style={styles.timerPill}>
            <Clock color="#DC2626" size={16} style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.timerTitle}>SOS Active</Text>
              <Text style={styles.timerText}>{formatTime(secondsActive)}</Text>
            </View>
          </View>

          <View style={[styles.buttonWrapper, { marginTop: 20 }]}>
            <Animated.View style={[styles.ring, { transform: [{ scale: ring1Anim }], opacity: ring1Anim.interpolate({ inputRange: [1, 1.5], outputRange: [0.3, 0] }) }]} />
            <Animated.View style={[styles.ring, { transform: [{ scale: ring2Anim }], opacity: ring2Anim.interpolate({ inputRange: [1, 2], outputRange: [0.2, 0] }) }]} />
            
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity activeOpacity={0.9} onPress={handleTriggerSOS} disabled={sosActive} style={[styles.sosButton, styles.sosButtonActiveGlow]}>
                <Text style={styles.sosButtonTextMain}>SOS</Text>
                <Text style={styles.sosButtonTextSub}>ACTIVE</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.activeCardsContainer}>
            <View style={styles.alertCard}>
              <Text style={styles.alertCardTitle}>Alert Transmitted</Text>
              <Text style={styles.alertCardSub}>Help is on the way.</Text>
            </View>
            <View style={styles.infoCardBlue}>
              <View style={styles.cardIconBlue}><Users color="#FFF" size={20} /></View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitleBlue}>Emergency Contacts</Text>
                <Text style={styles.cardSubBlue}>3 Notified</Text>
              </View>
              <View style={styles.statusDotGreen} />
            </View>
            <View style={styles.infoCardGreen}>
              <View style={styles.cardIconGreen}><MapPin color="#FFF" size={20} /></View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitleGreen}>Live Location</Text>
                <Text style={styles.cardSubGreen}>Sharing with SafeGuard team</Text>
              </View>
              <View style={styles.statusDotRed} />
            </View>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={handleInitiateCancel}>
            <Text style={styles.cancelButtonText}>Cancel SOS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ImageBackground source={getMapBackgroundSource()} style={styles.fullScreenBg} resizeMode="cover">
      <SafeAreaView style={styles.transparentSafe}>
        
        {/* Header */}
        <View style={styles.headerLite}>
          <Text style={styles.screenTitleCentered}>Safety Dashboard</Text>
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

        {/* Main SOS Button & Rings */}
        <View style={styles.idleButtonWrapper}>
          <Animated.View style={[styles.ring, { transform: [{ scale: ring1Anim }], opacity: ring1Anim.interpolate({ inputRange: [1, 1.5], outputRange: [0.5, 0] }) }]} />
          <Animated.View style={[styles.ring, { transform: [{ scale: ring2Anim }], opacity: ring2Anim.interpolate({ inputRange: [1, 2], outputRange: [0.3, 0] }) }]} />
          
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleTriggerSOS} style={styles.sosButton}>
              <Text style={styles.sosButtonTextMain}>SOS</Text>
              <Text style={styles.sosButtonTextSub}>PRESS IN EMERGENCY</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Bottom Nav Buttons */}
        <View style={styles.bottomButtonsContainer}>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  fullScreenBg: { flex: 1, width: '100%', height: '100%' },
  transparentSafe: { flex: 1, alignItems: 'center', backgroundColor: 'transparent' },
  
  // Header
  headerLite: { width: '100%', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 50 : 20, paddingBottom: 16 },
  screenTitleCentered: { fontSize: 26, fontWeight: '800', color: '#111827' },
  
  // Location Card
  locationCard: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 16, borderRadius: 16, width: '85%', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginTop: 10 },
  locationIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  locationLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5, marginBottom: 2 },
  locationText: { fontSize: 16, fontWeight: '600', color: '#111827' },

  // Active / Main Content Layout
  mainContent: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  
  /* SOS Button & Rings */
  idleButtonWrapper: { position: 'absolute', top: '35%', alignItems: 'center', justifyContent: 'center' },
  buttonWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', height: 300, width: '100%' },
  ring: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: '#DC2626' },
  sosButton: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', shadowColor: "#DC2626", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  sosButtonActiveGlow: { shadowColor: "#DC2626", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 40, elevation: 20 },
  sosButtonTextMain: { color: '#FFF', fontSize: 64, fontWeight: '900', letterSpacing: 2 },
  sosButtonTextSub: { color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 4, letterSpacing: 0.5, opacity: 0.9 },
  
  /* Bottom Nav Buttons (Idle Map Screen) */
  bottomButtonsContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 30, flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 24 },
  bottomBtn: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 16, padding: 16, marginHorizontal: 6, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  btnIconBoxWrapper: { marginRight: 12, opacity: 0.8 },
  bottomBtnText: { color: '#374151', fontSize: 13, fontWeight: '600', lineHeight: 18 },

  /* Active SOS Status UI */
  timerPill: { flexDirection: 'row', backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, alignItems: 'center', marginBottom: 20 },
  timerTitle: { fontSize: 10, color: '#991B1B', fontWeight: 'bold' },
  timerText: { fontSize: 16, color: '#DC2626', fontWeight: '900' },
  
  activeCardsContainer: { width: '100%', marginTop: 20 },
  alertCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  alertCardTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  alertCardSub: { fontSize: 14, color: '#4B5563' },
  infoCardBlue: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  cardIconBlue: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  cardTitleBlue: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  cardSubBlue: { fontSize: 16, color: '#1E3A8A', fontWeight: '800' },
  infoCardGreen: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 30 },
  cardIconGreen: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  cardTitleGreen: { fontSize: 12, color: '#059669', fontWeight: '600' },
  cardSubGreen: { fontSize: 12, color: '#064E3B', fontWeight: '500', marginTop: 2 },
  cardTextContainer: { flex: 1, marginLeft: 12 },
  statusDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  statusDotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  cancelButton: { backgroundColor: '#111827', width: '100%', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  /* Custom PIN Screen */
  pinScreen: { flex: 1, width: '100%', alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  shieldIconContainer: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  pinTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  pinSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 40 },
  pinBoxContainer: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: 40 },
  pinBox: { width: 60, height: 75, backgroundColor: '#FFF', borderRadius: 12, marginHorizontal: 8, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  pinBoxText: { fontSize: 36, color: '#111827' },
  keypadContainer: { width: '100%', maxWidth: 320, marginBottom: 40 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  keypadBtn: { width: (width - 120) / 3, height: 65, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  keypadNum: { fontSize: 28, fontWeight: '800', color: '#111827' },
  returnButton: { backgroundColor: '#DC2626', width: '100%', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  returnButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  returnSubtext: { fontSize: 12, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 }
});