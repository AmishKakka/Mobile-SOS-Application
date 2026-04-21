import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Lock, ShieldCheck } from 'lucide-react-native';

export default function SetupPinScreen({ navigation }: any) {
  const [pin, setPin] = useState('');

  const handleComplete = () => {
    if (pin.length === 4) {
      // In a real app, save pin to AsyncStorage/backend here
      Alert.alert('Security Set', 'Your 4-digit PIN has been saved successfully.');
      navigation.replace('MainDashboard');
    } else {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit code.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <Text style={styles.stepHeader}>STEP 5 OF 5: SECURITY SETUP</Text>
        <Lock color="#1E3A5F" size={48} style={{ marginBottom: 20 }} />
        <Text style={styles.title}>Setup Security PIN</Text>
        <Text style={styles.subtitle}>
          This 4-digit code will be required to cancel an active SOS alert.
        </Text>

        <TextInput
          style={styles.pinInput}
          placeholder="••••"
          placeholderTextColor="#D1D5DB"
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
          value={pin}
          onChangeText={setPin}
          autoFocus
        />

        <View style={styles.infoBox}>
          <ShieldCheck color="#10B981" size={20} />
          <Text style={styles.infoText}>Prevents accidental or forced cancellation.</Text>
        </View>

        <TouchableOpacity style={styles.finishBtn} onPress={handleComplete}>
          <Text style={styles.finishText}>Complete Setup & Enter App</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FAFAFA' },
  content:    { padding: 32, flex: 1, justifyContent: 'center', alignItems: 'center' },
  stepHeader: { color: '#1E3A5F', fontWeight: '800', fontSize: 12, marginBottom: 20 },
  title:      { fontSize: 28, fontWeight: '900', color: '#111827', textAlign: 'center' },
  subtitle:   { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 10, marginBottom: 40, lineHeight: 22 },
  pinInput:   { backgroundColor: '#F3F4F6', width: 200, height: 80, borderRadius: 20, textAlign: 'center', fontSize: 36, fontWeight: 'bold', letterSpacing: 15, color: '#111827' },
  infoBox:    { flexDirection: 'row', alignItems: 'center', marginTop: 30, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12 },
  infoText:   { color: '#065F46', fontSize: 13, fontWeight: '600', marginLeft: 8 },
  finishBtn:  { backgroundColor: '#1E3A5F', width: '100%', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 50 },
  finishText: { color: '#FFF', fontWeight: '900', fontSize: 18 },
});
