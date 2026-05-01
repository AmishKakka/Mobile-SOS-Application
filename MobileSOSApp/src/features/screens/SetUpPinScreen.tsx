import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, ArrowRight, Lock, ShieldCheck } from 'lucide-react-native';

import { setSecurityPin } from '../../services/securityPin';

type Props = {
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
  border: '#EBE7E1',
  success: '#0F9F6E',
};

function sanitizePin(value: string) {
  return value.replace(/\D/g, '').slice(0, 4);
}

export default function SetUpPinScreen({ navigation }: Props) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = useMemo(
    () => pin.length === 4 && confirmPin.length === 4 && pin === confirmPin,
    [confirmPin, pin],
  );

  const handleComplete = async () => {
    if (isSaving) {
      return;
    }

    if (pin.length !== 4 || confirmPin.length !== 4) {
      setErrorMessage('Please enter and confirm a 4-digit PIN.');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMessage('PIN confirmation does not match.');
      return;
    }

    try {
      setErrorMessage('');
      setIsSaving(true);
      await setSecurityPin(pin);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainDashboard' }],
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to save your security PIN.');
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
        <View style={styles.screenContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft color={P.textPrimary} size={30} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={[styles.progressBar, styles.progressActive]} />
            <View style={[styles.progressBar, styles.progressActive]} />
          </View>

          <View style={styles.header}>
            <Text style={styles.stepText}>STEP 4 OF 4: SECURITY PIN</Text>
            <Text style={styles.title}>Set your SOS PIN</Text>
            <Text style={styles.subtitle}>
              This 4-digit PIN is required before an active SOS can be cancelled
              from your phone.
            </Text>
          </View>

          <View style={styles.iconCircle}>
            <Lock color={P.red} size={42} strokeWidth={2.4} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Create PIN</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="0000"
              placeholderTextColor={P.placeholder}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={pin}
              onChangeText={text => {
                setPin(sanitizePin(text));
                setErrorMessage('');
              }}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm PIN</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="0000"
              placeholderTextColor={P.placeholder}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={confirmPin}
              onChangeText={text => {
                setConfirmPin(sanitizePin(text));
                setErrorMessage('');
              }}
            />
          </View>

          <View style={styles.infoBox}>
            <ShieldCheck color={P.success} size={21} strokeWidth={2.5} />
            <Text style={styles.infoText}>
              Prevents accidental or forced SOS cancellation.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Pressable
              style={[
                styles.submitButton,
                (!canSubmit || isSaving) && styles.submitButtonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!canSubmit || isSaving}
            >
              <Text
                style={styles.submitButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {isSaving ? 'Saving...' : 'Complete Setup'}
              </Text>
              {!isSaving ? (
                <ArrowRight color="#FFFFFF" size={28} strokeWidth={2.6} />
              ) : null}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.bg },
  keyboardAvoidingView: { flex: 1 },
  screenContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 18,
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
    fontSize: 32,
    fontWeight: '900',
    color: P.textPrimary,
    marginBottom: 8,
    lineHeight: 38,
  },
  subtitle: { fontSize: 15, color: P.textSecondary, lineHeight: 22 },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FCE8EA',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#F4CDD2',
  },
  inputGroup: { marginBottom: 16 },
  label: {
    marginBottom: 8,
    color: P.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  pinInput: {
    backgroundColor: P.fieldBg,
    borderRadius: 18,
    minHeight: 62,
    color: P.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 14,
    paddingHorizontal: 18,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: P.border,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F6F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: P.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  buttonContainer: { marginTop: 'auto', alignItems: 'center' },
  submitButton: {
    backgroundColor: P.red,
    borderRadius: 20,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    shadowColor: P.red,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 22,
    elevation: 7,
  },
  submitButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  errorText: {
    color: P.red,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
});
