import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { User, Camera, Phone, MapPin, Ruler, Weight } from 'lucide-react-native';

export default function PersonalDetailsScreen({ navigation }: any) {
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [height, setHeight]   = useState('');
  const [weight, setWeight]   = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <Text style={styles.stepHeader}>STEP 3 OF 5: PERSONAL DETAILS</Text>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>
            Tell us who you are, so we can help you faster.
          </Text>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <User color="#9CA3AF" size={48} />
            </View>
            <TouchableOpacity style={styles.cameraCircle} activeOpacity={0.7}>
              <Camera color="#FFF" size={18} />
            </TouchableOpacity>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Phone color="#9CA3AF" size={18} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="(555) 000-0000" keyboardType="phone-pad"
                value={phone} onChangeText={setPhone} placeholderTextColor="#D1D5DB" />
            </View>
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Home Address</Text>
            <View style={styles.inputWrapper}>
              <MapPin color="#9CA3AF" size={18} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="123 Main St, Apt 4B"
                value={address} onChangeText={setAddress} placeholderTextColor="#D1D5DB" />
            </View>
            <Text style={styles.helperText}>ℹ Used for location-based alerts</Text>
          </View>

          {/* Height + Weight */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.inputWrapper}>
                <Ruler color="#9CA3AF" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="5'10" value={height}
                  onChangeText={setHeight} placeholderTextColor="#D1D5DB" />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Weight (lbs)</Text>
              <View style={styles.inputWrapper}>
                <Weight color="#9CA3AF" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="160" keyboardType="numeric"
                  value={weight} onChangeText={setWeight} placeholderTextColor="#D1D5DB" />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.navigate('MedicalInfo')} activeOpacity={0.8}>
            <Text style={styles.nextText}>Next: Medical Info →</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 24, flexGrow: 1 },
  stepHeader:    { color: '#1E3A5F', fontWeight: '800', fontSize: 12, marginBottom: 8, letterSpacing: 0.5 },
  title:         { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 12 },
  subtitle:      { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 30 },
  avatarWrapper: { alignSelf: 'center', position: 'relative', marginBottom: 35 },
  avatarCircle:  { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  cameraCircle:  { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1E3A5F', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  inputGroup:    { marginBottom: 20 },
  label:         { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  inputWrapper:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, height: 56, paddingHorizontal: 16 },
  inputIcon:     { marginRight: 12 },
  input:         { flex: 1, fontSize: 16, color: '#111827', fontWeight: '500' },
  helperText:    { fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: '500' },
  row:           { flexDirection: 'row' },
  nextBtn:       { backgroundColor: '#1E3A5F', width: '100%', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 20, elevation: 4 },
  nextText:      { color: '#FFF', fontWeight: '900', fontSize: 18 },
});
