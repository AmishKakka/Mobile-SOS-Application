import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Activity, AlertCircle } from 'lucide-react-native';

export default function MedicalInfoScreen({ navigation }: any) {
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.stepHeader}>STEP 4 OF 5: MEDICAL INFORMATION</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Health Profile</Text>
          <Activity color="#1E3A5F" size={28} />
        </View>
        <Text style={styles.subtitle}>Responders use this to provide correct care upon arrival.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blood Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., O+, A-"
            value={bloodType}
            onChangeText={setBloodType}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Known Allergies</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 15 }]}
            placeholder="Medications, food, etc."
            multiline
            value={allergies}
            onChangeText={setAllergies}
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.noteRow}>
            <AlertCircle color="#6B7280" size={14} />
            <Text style={styles.noteText}>Crucial for emergency medical administration.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.navigate('SetupPin')}>
          <Text style={styles.nextText}>Next: Setup Security PIN →</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FAFAFA' },
  content:    { padding: 24, flexGrow: 1, justifyContent: 'center' },
  stepHeader: { color: '#1E3A5F', fontWeight: '800', fontSize: 12, marginBottom: 8 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:      { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle:   { fontSize: 15, color: '#6B7280', marginTop: 8, marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label:      { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input:      { backgroundColor: '#F3F4F6', height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: '#111827' },
  noteRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  noteText:   { fontSize: 12, color: '#6B7280', marginLeft: 6 },
  nextBtn:    { backgroundColor: '#1E3A5F', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 20 },
  nextText:   { color: '#FFF', fontWeight: '900', fontSize: 18 },
});
