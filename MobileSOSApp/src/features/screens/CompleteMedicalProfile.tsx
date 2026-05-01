import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { API_BASE_URL } from '../../config/config';
import { fetchAuthSession } from 'aws-amplify/auth';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Activity,
  ArrowLeft,
  Check,
  Droplets,
  HeartPulse,
  Pill,
} from 'lucide-react-native';

type CompleteMedicalProfileProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

const P = {
  bg: '#FAF9F6',
  fieldBg: '#F4F4F0',
  textPrimary: '#111111',
  textSecondary: '#4E3F3F',
  muted: '#8F6E70',
  placeholder: '#D8B8BC',
  progressTrack: '#EDEDE8',
  red: '#C8102E',
  blue: '#155E8A',
};

export default function CompleteMedicalProfile({
  navigation,
}: CompleteMedicalProfileProps) {
  const [medicalData, setMedicalData] = useState({
    bloodType: '',
    allergies: '',
    medications: '',
    conditions: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setErrorMessage('');
      setIsSaving(true);

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const formattedMedicalData = {
        bloodGroup: medicalData.bloodType
          ? medicalData.bloodType.trim().toUpperCase()
          : null,
        allergies: medicalData.allergies
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        medications: medicalData.medications
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        conditions: medicalData.conditions
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
      };

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          medical: formattedMedicalData,
        }),
      });

      if (response.ok) {
        navigation.replace('SetUpPin');
      } else {
        const text = await response.text();
        setErrorMessage(text || 'Medical profile update failed.');
      }
    } catch (error) {
      console.error('Network error during medical update:', error);
      setErrorMessage('Network error while saving medical information.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft color={P.textPrimary} size={30} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={styles.progressBar} />
          </View>

          <View style={styles.header}>
            <Text style={styles.stepText}>STEP 3 OF 4: HEALTH DATA</Text>
            <Text style={styles.title}>Medical History</Text>
            <Text style={styles.subtitle}>
              Optional health details help responders make better decisions
              during an SOS event.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Type</Text>
            <View style={styles.inputContainer}>
              <Droplets color={P.muted} size={22} />
              <TextInput
                style={styles.input}
                placeholder="e.g. O+, A-, AB+"
                placeholderTextColor={P.placeholder}
                value={medicalData.bloodType}
                onChangeText={t =>
                  setMedicalData({ ...medicalData, bloodType: t })
                }
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Activity color={P.muted} size={22} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Peanuts, Penicillin"
                placeholderTextColor={P.placeholder}
                multiline
                value={medicalData.allergies}
                onChangeText={t =>
                  setMedicalData({ ...medicalData, allergies: t })
                }
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Medications</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Pill color={P.muted} size={22} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List any daily medications"
                placeholderTextColor={P.placeholder}
                multiline
                value={medicalData.medications}
                onChangeText={t =>
                  setMedicalData({ ...medicalData, medications: t })
                }
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chronic Conditions</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <HeartPulse color={P.muted} size={22} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Asthma, Diabetes"
                placeholderTextColor={P.placeholder}
                multiline
                value={medicalData.conditions}
                onChangeText={t =>
                  setMedicalData({ ...medicalData, conditions: t })
                }
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Pressable
              style={styles.submitButton}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.submitButtonText}>
                {isSaving ? 'Saving...' : 'Next: Security PIN'}
              </Text>
              {!isSaving ? (
                <Check color="#FFFFFF" size={25} strokeWidth={2.8} />
              ) : null}
            </Pressable>

            {/* <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity> */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.bg },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 34,
    flexGrow: 1,
  },
  backButton: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18 },
  progressContainer: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: P.progressTrack,
    borderRadius: 999,
  },
  progressActive: { backgroundColor: P.red },
  header: { marginBottom: 22 },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.blue,
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: P.textPrimary,
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: { fontSize: 15, color: P.textSecondary, lineHeight: 22 },
  inputGroup: { marginBottom: 16 },
  label: {
    marginBottom: 8,
    color: P.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.fieldBg,
    borderRadius: 18,
    paddingHorizontal: 18,
    minHeight: 56,
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, color: P.textPrimary, paddingVertical: 0 },
  textAreaContainer: {
    minHeight: 78,
    alignItems: 'flex-start',
    paddingTop: 16,
  },
  textArea: { minHeight: 54, textAlignVertical: 'top', paddingTop: 0 },
  buttonContainer: { marginTop: 20, marginBottom: 8, alignItems: 'center' },
  submitButton: {
    backgroundColor: P.red,
    borderRadius: 20,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
    flexDirection: 'row',
    gap: 10,
    shadowColor: P.red,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 22,
    elevation: 7,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  skipText: { color: P.blue, fontSize: 16, fontWeight: '700' },
  errorText: {
    color: P.red,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
});
