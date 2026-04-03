import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { HeartPulse, Pill } from 'lucide-react-native';

const MedicalProfileScreen = () => {
  const [formData, setFormData] = useState({
    diseases: '',
    medications: '',
  });

  const handleSave = () => {
    console.log('Saving medical profile to MongoDB...', formData);

  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page Header */}
        <Text style={styles.header}>Medical Profile</Text>
        <Text style={styles.subheader}>
          This information may be shared with first responders during an emergency.
        </Text>

        {/* Diseases / Conditions */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
              <HeartPulse color="#DC2626" size={18} />
            </View>
            <Text style={styles.label}>Diseases / Medical Conditions</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder={
              'e.g. Type 2 Diabetes, Hypertension, Asthma...\n\nList any chronic conditions, allergies, or medical history that first responders should know about.'
            }
            placeholderTextColor="#9CA3AF"
            value={formData.diseases}
            onChangeText={(t) => setFormData({ ...formData, diseases: t })}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Medications */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
              <Pill color="#10B981" size={18} />
            </View>
            <Text style={styles.label}>Current Medications</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder={
              'e.g. Metformin 500mg, Lisinopril 10mg...\n\nList medications you are currently taking, including dosage if known.'
            }
            placeholderTextColor="#9CA3AF"
            value={formData.medications}
            onChangeText={(t) => setFormData({ ...formData, medications: t })}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>🔒 Privacy Notice</Text>
          <Text style={styles.privacyText}>
            Your medical information is encrypted and only shared with verified
            first responders when an SOS is triggered. It is never shared
            without your consent.
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Medical Profile</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 24, paddingBottom: 48 },

  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 32,
  },

  inputGroup: { marginBottom: 28 },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },

  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 160,
    lineHeight: 22,
  },

  privacyCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 28,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 6,
  },
  privacyText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 19,
  },

  saveButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default MedicalProfileScreen;