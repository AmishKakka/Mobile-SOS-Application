import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { confirmSignUp, signIn, signUp } from 'aws-amplify/auth';
import {
  ArrowRight,
  CheckCircle,
  Circle,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getCurrentAppUser,
  getCurrentIdToken,
  syncAuthenticatedUser,
} from '../../services/appUser';
import { useVictimSOS } from '../sos/VictimSOSContext';

type AuthMode = 'signin' | 'register' | 'verify';

type AuthScreenProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

const P = {
  bg: '#FAF9F6',
  card: '#FFFFFF',
  fieldBg: '#F4F4F0',
  textPrimary: '#111111',
  textSecondary: '#4E3F3F',
  muted: '#8F6E70',
  placeholder: '#D8B8BC',
  red: '#C8102E',
  blue: '#155E8A',
  border: '#EBE7E1',
  success: '#0F9F6E',
};

export default function AuthScreen({ navigation }: AuthScreenProps) {
  const { refreshSession } = useVictimSOS();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [message, setMessage] = useState('');

  const isRegister = mode === 'register';
  const isVerifying = mode === 'verify';
  const hasLength = password.length >= 8 && password.length <= 16;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isSuccessMessage = /success|verified|check your email/i.test(message);

  const canSubmit = useMemo(() => {
    if (isVerifying) {
      return authCode.length === 6;
    }

    if (!email.trim() || !password.trim()) {
      return false;
    }

    if (isRegister) {
      const hasValidName =
        firstName.trim().length > 0 && lastName.trim().length > 0;
      const passwordsMatch = confirmPassword.trim() === password.trim();
      const isPasswordValid = hasLength && hasNumber && hasSymbol;
      return hasValidName && passwordsMatch && isPasswordValid;
    }

    return true;
  }, [
    authCode,
    confirmPassword,
    email,
    firstName,
    hasLength,
    hasNumber,
    hasSymbol,
    isRegister,
    isVerifying,
    lastName,
    password,
  ]);

  async function ensureSignedInSession(
    username: string,
    passwordValue: string,
  ) {
    const result = await signIn({ username, password: passwordValue });

    if (!result.isSignedIn) {
      const step = result.nextStep?.signInStep || 'UNKNOWN_STEP';
      throw new Error(`Sign-in did not complete. Next step required: ${step}`);
    }

    const idToken = await getCurrentIdToken({
      retries: 8,
      delayMs: 400,
      forceRefresh: true,
    });

    if (!idToken) {
      throw new Error('Sign-in completed but no ID token was returned.');
    }

    return idToken;
  }

  async function onSubmit() {
    if (!canSubmit) {
      return;
    }

    setMessage('');

    try {
      if (isRegister) {
        await signUp({
          username: email,
          password,
          options: {
            userAttributes: {
              given_name: firstName,
              family_name: lastName,
            },
          },
        });

        setMode('verify');
        setMessage('Success! Check your email for a verification code.');
      } else if (isVerifying) {
        await confirmSignUp({
          username: email,
          confirmationCode: authCode,
        });

        try {
          await ensureSignedInSession(email, password);
          const appUser = await syncAuthenticatedUser();
          await refreshSession();
          setMessage('Email verified and sign in successful!');
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: appUser.setupRoute }],
            });
          }, 600);
        } catch (signInAfterVerifyError: any) {
          setMessage(
            signInAfterVerifyError?.message ||
              'Email verified. Please sign in to continue.',
          );
          setMode('signin');
        }
      } else {
        await ensureSignedInSession(email, password);
        const appUser = await getCurrentAppUser();
        await refreshSession();

        setMessage('Sign in successful!');

        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: appUser.setupRoute }],
          });
        }, 1000);
      }
    } catch (error: any) {
      setMessage(error.message || 'Authentication failed. Please try again.');
    }
  }

  const title = isVerifying
    ? 'Verify your email'
    : isRegister
    ? 'Create account'
    : 'Welcome back';

  const subtitle = isVerifying
    ? 'Enter the 6-digit code sent to your email to continue.'
    : isRegister
    ? 'Create your SafeGuard account before profile setup.'
    : 'Sign in to access your safety dashboard.';

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
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <ShieldCheck color={P.red} size={34} strokeWidth={2.3} />
            </View>
            <Text style={styles.stepText}>SAFEGUARD ACCESS</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {!isVerifying && (
            <View style={styles.switchRow}>
              <Pressable
                style={[
                  styles.switchButton,
                  !isRegister && styles.switchButtonActive,
                ]}
                onPress={() => setMode('signin')}
              >
                <Text
                  style={
                    !isRegister ? styles.switchTextActive : styles.switchText
                  }
                >
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.switchButton,
                  isRegister && styles.switchButtonActive,
                ]}
                onPress={() => setMode('register')}
              >
                <Text
                  style={
                    isRegister ? styles.switchTextActive : styles.switchText
                  }
                >
                  Register
                </Text>
              </Pressable>
            </View>
          )}

          {isVerifying ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <View style={styles.inputContainer}>
                <KeyRound color={P.muted} size={21} strokeWidth={2.2} />
                <TextInput
                  style={styles.input}
                  value={authCode}
                  onChangeText={setAuthCode}
                  placeholder="123456"
                  placeholderTextColor={P.placeholder}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>
          ) : (
            <>
              {isRegister && (
                <View style={styles.nameRow}>
                  <View style={styles.nameInput}>
                    <Text style={styles.label}>First Name</Text>
                    <View style={styles.inputContainer}>
                      <User color={P.muted} size={20} strokeWidth={2.2} />
                      <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="John"
                        placeholderTextColor={P.placeholder}
                      />
                    </View>
                  </View>
                  <View style={styles.nameInput}>
                    <Text style={styles.label}>Last Name</Text>
                    <View style={styles.inputContainer}>
                      <User color={P.muted} size={20} strokeWidth={2.2} />
                      <TextInput
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Doe"
                        placeholderTextColor={P.placeholder}
                      />
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Mail color={P.muted} size={20} strokeWidth={2.2} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    placeholderTextColor={P.placeholder}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Lock color={P.muted} size={20} strokeWidth={2.2} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor={P.placeholder}
                    secureTextEntry
                  />
                </View>
              </View>

              {isRegister && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.inputContainer}>
                      <Lock color={P.muted} size={20} strokeWidth={2.2} />
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm password"
                        placeholderTextColor={P.placeholder}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View style={styles.passwordRequirements}>
                    <RequirementRow met={hasLength} text="8-16 characters" />
                    <RequirementRow met={hasNumber} text="At least 1 number" />
                    <RequirementRow
                      met={hasSymbol}
                      text="At least 1 special symbol"
                    />
                  </View>
                </>
              )}
            </>
          )}

          {message ? (
            <View
              style={[
                styles.messageBox,
                isSuccessMessage && styles.messageBoxSuccess,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isSuccessMessage && styles.messageTextSuccess,
                ]}
              >
                {message}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitButtonText}>
              {isVerifying
                ? 'Verify Code'
                : isRegister
                ? 'Create Account'
                : 'Sign In'}
            </Text>
            <ArrowRight color="#FFFFFF" size={24} strokeWidth={2.5} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RequirementRow({ met, text }: { met: boolean; text: string }) {
  const Icon = met ? CheckCircle : Circle;

  return (
    <View style={styles.reqRow}>
      <Icon color={met ? P.success : P.muted} size={15} strokeWidth={2.4} />
      <Text style={[styles.reqText, met ? styles.reqMet : styles.reqUnmet]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.bg },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 34,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: { marginBottom: 24 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: P.border,
  },
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
    lineHeight: 38,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: P.textSecondary,
    lineHeight: 22,
  },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: P.fieldBg,
    borderRadius: 18,
    padding: 5,
    marginBottom: 22,
  },
  switchButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: P.card,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  switchText: { color: P.textSecondary, fontWeight: '700' },
  switchTextActive: { color: P.textPrimary, fontWeight: '900' },
  inputGroup: { marginBottom: 14 },
  nameRow: { flexDirection: 'row', gap: 14 },
  nameInput: { flex: 1, marginBottom: 14 },
  label: {
    marginBottom: 7,
    color: P.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.fieldBg,
    borderRadius: 18,
    paddingHorizontal: 16,
    minHeight: 54,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: P.textPrimary,
    paddingVertical: 0,
  },
  passwordRequirements: {
    backgroundColor: P.card,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 16,
    padding: 12,
    marginTop: 2,
    marginBottom: 14,
    gap: 8,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontSize: 13, fontWeight: '700' },
  reqMet: { color: P.success },
  reqUnmet: { color: P.textSecondary },
  messageBox: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FCE8EA',
    marginTop: 4,
  },
  messageBoxSuccess: { backgroundColor: '#E8F6F0' },
  messageText: {
    color: P.red,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 19,
  },
  messageTextSuccess: { color: P.success },
  submitButton: {
    backgroundColor: P.red,
    borderRadius: 20,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
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
