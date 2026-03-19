import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated, Dimensions, Platform } from "react-native";
import { ArrowLeft, User, Home, Shield, Clock, Users, MapPin, Delete } from "lucide-react-native";

const { width } = Dimensions.get('window');

export default function MainDashboard() {
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
    let interval;
    if (sosActive && !showPinPrompt) {
      interval = setInterval(() => setSecondsActive(prev => prev + 1), 1000);
    } else if (!sosActive) {
      setSecondsActive(0);
    }
    return () => clearInterval(interval);
  }, [sosActive, showPinPrompt]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Animation Logic
  useEffect(() => {
    if (sosActive || !sosActive) { // Always run rings for idle state based on design
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
  const handleKeyPress = (num) => {
    if (pin.length < 4) setPin(pin + num);
  };
  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CORRECT_PIN) {
        setSosActive(false);
        setShowPinPrompt(false);
        setPin("");
      } else {
        // Quick visual clear for wrong pin
        setTimeout(() => setPin(""), 300);
      }
    }
  }, [pin]);

  const handleReturnToSOS = () => {
    setShowPinPrompt(false);
    setPin("");
  };

  // Custom Keypad Component
  const KeypadButton = ({ num, onPress, isIcon }) => (
    <TouchableOpacity style={styles.keypadBtn} onPress={onPress}>
      {isIcon ? <Delete color="#111827" size={28} /> : <Text style={styles.keypadNum}>{num}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      {!showPinPrompt && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconCircle}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>HA</Text>
            </View>
            <View style={styles.statusDotHeader} />
          </View>
        </View>
      )}

      <View style={styles.mainContent}>
        {showPinPrompt ? (
          /* ----- SECURITY PIN SCREEN ----- */
          <View style={styles.pinScreen}>
            <View style={styles.shieldIconContainer}>
              <Shield color="#FFF" size={32} />
            </View>
            <Text style={styles.pinTitle}>Security Verification</Text>
            <Text style={styles.pinSub}>Enter your 4-digit PIN to cancel the emergency alert</Text>
            
            {/* PIN Boxes */}
            <View style={styles.pinBoxContainer}>
              {[0, 1, 2, 3].map((index) => (
                <View key={index} style={styles.pinBox}>
                  <Text style={styles.pinBoxText}>{pin[index] ? '•' : ''}</Text>
                </View>
              ))}
            </View>

            {/* Numeric Keypad */}
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
        ) : (
          /* ----- MAIN DASHBOARD (IDLE & ACTIVE) ----- */
          <>
            {/* Timer Pill (Active Only) */}
            {sosActive && (
              <View style={styles.timerPill}>
                <Clock color="#DC2626" size={16} style={{ marginRight: 6 }} />
                <View>
                  <Text style={styles.timerTitle}>SOS Active</Text>
                  <Text style={styles.timerText}>{formatTime(secondsActive)}</Text>
                </View>
              </View>
            )}

            {/* Big SOS Button with Rings */}
            <View style={[styles.buttonWrapper, sosActive && { marginTop: 20 }]}>
              {/* Animated Rings */}
              <Animated.View style={[styles.ring, { transform: [{ scale: ring1Anim }], opacity: ring1Anim.interpolate({ inputRange: [1, 1.5], outputRange: [0.3, 0] }) }]} />
              <Animated.View style={[styles.ring, { transform: [{ scale: ring2Anim }], opacity: ring2Anim.interpolate({ inputRange: [1, 2], outputRange: [0.2, 0] }) }]} />
              
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleTriggerSOS}
                  disabled={sosActive}
                  style={[styles.sosButton, sosActive && styles.sosButtonActiveGlow]}
                >
                  <Text style={styles.sosButtonTextMain}>SOS</Text>
                  <Text style={styles.sosButtonTextSub}>{sosActive ? "ACTIVE" : "PRESS IN EMERGENCY"}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Information Cards (Active Only) */}
            {sosActive && (
              <View style={styles.activeCardsContainer}>
                <View style={styles.alertCard}>
                  <Text style={styles.alertCardTitle}>Alert Transmitted</Text>
                  <Text style={styles.alertCardSub}>Help is on the way.</Text>
                </View>

                <View style={styles.infoCardBlue}>
                  <View style={styles.cardIconBlue}>
                    <Users color="#FFF" size={20} />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitleBlue}>Emergency Contacts</Text>
                    <Text style={styles.cardSubBlue}>3 Notified</Text>
                  </View>
                  <View style={styles.statusDotGreen} />
                </View>

                <View style={styles.infoCardGreen}>
                  <View style={styles.cardIconGreen}>
                    <MapPin color="#FFF" size={20} />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitleGreen}>Live Location</Text>
                    <Text style={styles.cardSubGreen}>Sharing with SafeGuard response team</Text>
                  </View>
                  <View style={styles.statusDotRed} />
                </View>
              </View>
            )}

            {/* Cancel Button (Active Only) */}
            {sosActive && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleInitiateCancel}>
                <Text style={styles.cancelButtonText}>Cancel SOS</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* FLOATING BOTTOM NAV (Idle Only) */}
      {!showPinPrompt && !sosActive && (
        <View style={styles.bottomNavContainer}>
          <Text style={styles.navLabel}>SAFETY DASHBOARD</Text>
          <View style={styles.floatingNavBar}>
            <TouchableOpacity style={styles.navIconBg}>
              <Home color="#111827" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navIconBg}>
              <User color="#111827" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 50 : 20 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  statusDotHeader: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF' },
  
  mainContent: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  
  /* SOS Button & Rings */
  buttonWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', height: 300, width: '100%', marginTop: 60 },
  ring: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: '#DC2626' },
  sosButton: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center', shadowColor: "#DC2626", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  sosButtonActiveGlow: { shadowColor: "#DC2626", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 40, elevation: 20 },
  sosButtonTextMain: { color: '#FFF', fontSize: 64, fontWeight: '900', letterSpacing: 2 },
  sosButtonTextSub: { color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 4, letterSpacing: 1, opacity: 0.9 },
  
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

  /* Floating Bottom Nav */
  bottomNavContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20, width: '100%', alignItems: 'center' },
  navLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 },
  floatingNavBar: { flexDirection: 'row', width: 140, justifyContent: 'space-between' },
  navIconBg: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },

  /* Custom PIN Screen */
  pinScreen: { flex: 1, width: '100%', alignItems: 'center', paddingTop: 20 },
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