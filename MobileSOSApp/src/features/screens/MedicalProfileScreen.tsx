import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  Activity,
  ArrowLeft,
  Droplets,
  HeartPulse,
  Pill,
  Save,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { API_BASE_URL } from '../../config/config';

type MedicalProfileProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

const P = {
  bg: '#FAF9F6',
  fieldBg: '#F4F4F0',
  textPrimary: '#111111',
  textSecondary: '#4E3F3F',
  muted: '#8F6E70',
  placeholder: '#D8B8BC',
  red: '#C8102E',
  blue: '#155E8A',
  border: '#EBE7E1',
};

export default function MedicalProfileScreen({
  navigation,
}: MedicalProfileProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [medicalData, setMedicalData] = useState({
    bloodType: '',
    allergies: '',
    medications: '',
    conditions: '',
  });

  useEffect(() => {
    const fetchMedicalData = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) {
          return;
        }

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();

          if (data.medical) {
            setMedicalData({
              bloodType: data.medical.bloodGroup || '',
              allergies: data.medical.allergies
                ? data.medical.allergies.join(', ')
                : '',
              medications: data.medical.medications
                ? data.medical.medications.join(', ')
                : '',
              conditions: data.medical.conditions
                ? data.medical.conditions.join(', ')
                : '',
            });
          }
        }
      } catch (error) {
        console.error('Failed to load medical profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedicalData();
  }, []);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    try {
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
        body: JSON.stringify({ medical: formattedMedicalData }),
      });

      if (response.ok) {
        navigation.goBack();
      } else {
        const err = await response.json();
        Alert.alert(
          'Error',
          err.message || 'Failed to update medical profile.',
        );
      }
    } catch (error) {
      console.error('Network error during medical update:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={P.red} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft color={P.textPrimary} size={30} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.stepText}>HEALTH DATA</Text>
            <Text style={styles.title}>Medical History</Text>
            <Text style={styles.subtitle}>
              Update your vital health details to inform responders during an
              SOS event.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Type</Text>
            <View style={styles.inputContainer}>
              <Droplets color={P.muted} size={22} strokeWidth={2.2} />
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
              <Activity color={P.muted} size={22} strokeWidth={2.2} />
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
              <Pill color={P.muted} size={22} strokeWidth={2.2} />
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
              <HeartPulse color={P.muted} size={22} strokeWidth={2.2} />
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

          <Pressable
            style={[
              styles.submitButton,
              isSaving && styles.submitButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.submitButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
            {!isSaving ? (
              <Save color="#FFFFFF" size={22} strokeWidth={2.5} />
            ) : null}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.bg },
  keyboardAvoidingView: { flex: 1 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 34,
    flexGrow: 1,
  },
  backButton: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18 },
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
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: P.textSecondary,
    lineHeight: 22,
  },
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
  input: {
    flex: 1,
    fontSize: 16,
    color: P.textPrimary,
    paddingVertical: 0,
  },
  textAreaContainer: {
    minHeight: 82,
    alignItems: 'flex-start',
    paddingTop: 16,
  },
  textArea: { minHeight: 56, textAlignVertical: 'top', paddingTop: 0 },
  submitButton: {
    backgroundColor: P.red,
    borderRadius: 20,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 10,
    shadowColor: P.red,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 22,
    elevation: 7,
  },
  submitButtonDisabled: { opacity: 0.48 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
});
