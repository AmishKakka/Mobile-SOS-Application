import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated, TextInput, Alert } from "react-native";
import { AlertCircle, Phone, MapPin, Radio, Lock } from "lucide-react-native";

export default function MainDashboard() {
  const [sosActive, setSosActive] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pin, setPin] = useState("");
  
  // The secure PIN (this would normally come from a database)
  const CORRECT_PIN = "1234"; 

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (sosActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sosActive]);

  const handleTriggerSOS = () => setSosActive(true);
  
  // Shows the PIN screen instead of instantly canceling
  const handleInitiateCancel = () => setShowPinPrompt(true);

  // Verifies the 4-digit PIN
  const handleVerifyPin = () => {
    if (pin === CORRECT_PIN) {
      setSosActive(false);
      setShowPinPrompt(false);
      setPin("");
    } else {
      Alert.alert("Incorrect PIN", "The security PIN you entered is invalid.");
      setPin("");
    }
  };

  const handleCancelPinPrompt = () => {
    setShowPinPrompt(false);
    setPin("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SafeGuard</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Ready</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        {sosActive && !showPinPrompt && (
          <View style={styles.alertBanner}>
            <AlertCircle color="#DC2626" size={24} />
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitle}>Emergency Alert Active</Text>
              <Text style={styles.alertSub}>Your location is being shared with emergency responders.</Text>
            </View>
          </View>
        )}

        {/* PIN Verification Screen UI */}
        {showPinPrompt ? (
          <View style={styles.pinContainer}>
            <Lock color="#111827" size={48} style={{ marginBottom: 16 }} />
            <Text style={styles.pinTitle}>Enter Security PIN</Text>
            <Text style={styles.pinSub}>Please enter your 4-digit PIN to cancel the SOS alert.</Text>
            
            <TextInput
              style={styles.pinInput}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry={true}
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              placeholderTextColor="#9CA3AF"
              autoFocus={true}
            />

            <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyPin}>
              <Text style={styles.verifyButtonText}>Verify & Cancel SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={handleCancelPinPrompt}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Normal Dashboard UI */
          <>
            <Animated.View style={{ opacity: sosActive ? pulseAnim : 1 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTriggerSOS}
                disabled={sosActive}
                style={[styles.sosButton, sosActive ? styles.sosButtonActive : styles.sosButtonIdle]}
              >
                <AlertCircle color="#FFF" size={64} />
                <Text style={styles.sosButtonText}>
                  {sosActive ? "SOS ACTIVE" : "TRIGGER SOS"}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {sosActive ? (
              <View style={styles.activeInfoContainer}>
                <View style={styles.liveTrackingCard}>
                  <Radio color="#DC2626" size={24} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.liveTextMain}>Live GPS coordinates sending...</Text>
                    <Text style={styles.liveTextSub}>LIVE</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.cancelButton} onPress={handleInitiateCancel}>
                  <Text style={styles.cancelButtonText}>Cancel SOS</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.idleInfoContainer}>
                <Text style={styles.instructionText}>
                  Press the button above to trigger an emergency SOS alert and share your live location.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { color: '#4B5563', fontSize: 14 },
  mainContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  alertBanner: { flexDirection: 'row', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#FCA5A5', marginBottom: 40, width: '100%' },
  alertTextContainer: { marginLeft: 12, flex: 1 },
  alertTitle: { color: '#7F1D1D', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  alertSub: { color: '#991B1B', fontSize: 14 },
  sosButton: { width: 280, height: 280, borderRadius: 140, justifyContent: 'center', alignItems: 'center', borderWidth: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  sosButtonIdle: { backgroundColor: '#DC2626', borderColor: '#991B1B' },
  sosButtonActive: { backgroundColor: '#EF4444', borderColor: '#DC2626' },
  sosButtonText: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 16, letterSpacing: 2 },
  activeInfoContainer: { width: '100%', marginTop: 40, alignItems: 'center' },
  liveTrackingCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, marginBottom: 20 },
  liveTextMain: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  liveTextSub: { fontSize: 12, color: '#DC2626', fontWeight: 'bold', marginTop: 4 },
  cancelButton: { backgroundColor: '#111827', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  cancelButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  idleInfoContainer: { width: '100%', marginTop: 40, alignItems: 'center' },
  instructionText: { textAlign: 'center', color: '#4B5563', fontSize: 16, marginBottom: 24, paddingHorizontal: 20 },
  
  // PIN Prompt Styles
  pinContainer: { width: '100%', alignItems: 'center', backgroundColor: '#FFF', padding: 24, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  pinTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  pinSub: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginBottom: 24 },
  pinInput: { backgroundColor: '#F3F4F6', width: '100%', paddingVertical: 16, borderRadius: 12, fontSize: 32, letterSpacing: 16, textAlign: 'center', color: '#111827', fontWeight: 'bold', marginBottom: 24 },
  verifyButton: { backgroundColor: '#DC2626', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  verifyButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  backButton: { paddingVertical: 12 },
  backButtonText: { color: '#4B5563', fontSize: 16, fontWeight: 'bold' }
});