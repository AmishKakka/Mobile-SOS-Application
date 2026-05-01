import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { API_BASE_URL } from '../../config/config';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Camera,
  MapPin,
  Phone,
  Scale,
  User,
} from 'lucide-react-native';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';

type CompleteProfileProps = {
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

export default function CompleteProfile({ navigation }: CompleteProfileProps) {
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    height: '',
    weight: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 10);
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length > 6) {
      formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(
        3,
        6,
      )}-${cleaned.slice(6)}`;
    }
    setFormData({ ...formData, phone: formatted });
  };

  const canSubmit = useMemo(() => {
    const rawDigits = formData.phone.replace(/\D/g, '');
    return rawDigits.length === 10;
  }, [formData.phone]);

  const handlePhotoResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }

    if (response.errorCode) {
      Alert.alert(
        'Photo error',
        response.errorMessage || 'Could not open the selected photo source.',
      );
      return;
    }

    const selectedUri = response.assets?.[0]?.uri;
    if (selectedUri) {
      setProfilePhotoUri(selectedUri);
    }
  };

  const handleChooseFromGallery = async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.85,
      maxWidth: 900,
      maxHeight: 900,
    });
    handlePhotoResponse(response);
  };

  const handleTakePhoto = async () => {
    const response = await launchCamera({
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.85,
      maxWidth: 900,
      maxHeight: 900,
    });
    handlePhotoResponse(response);
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Profile photo',
      'Choose how you want to add your profile picture.',
      [
        { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleNext = async () => {
    if (!canSubmit || isSaving) return;

    try {
      setErrorMessage('');
      setIsSaving(true);

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        const message = 'Your session expired. Please sign in again.';
        setErrorMessage(message);
        console.error('No token found. User might not be logged in.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: formData.phone,
          address: formData.address,
          height: formData.height,
          weight: formData.weight,
        }),
      });

      if (response.ok) {
        navigation.navigate('AddEmergencyContacts');
      } else {
        const errorText = await response.text();
        let nextErrorMessage = 'Failed to save your profile. Please try again.';

        try {
          const errorData = errorText ? JSON.parse(errorText) : null;
          nextErrorMessage =
            errorData?.message || errorData?.error || nextErrorMessage;
        } catch {
          nextErrorMessage = errorText || nextErrorMessage;
        }

        setErrorMessage(nextErrorMessage);
        console.error('Profile update failed:', nextErrorMessage);
      }
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Network error while saving your profile. Please try again.',
      );
      console.error('Network error during profile update:', error);
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
            <View style={styles.progressBar} />
            <View style={styles.progressBar} />
            <View style={styles.progressBar} />
          </View>

          <View style={styles.header}>
            <Text style={styles.stepText}>STEP 1 OF 4: PERSONAL DETAILS</Text>
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>
              Tell us who you are, so we can help you faster. Responders use
              this info to identify and reach you quickly.
            </Text>
          </View>

          <View style={styles.photoWrapper}>
            <View style={styles.photoCircle}>
              {profilePhotoUri ? (
                <Image
                  source={{ uri: profilePhotoUri }}
                  style={styles.profilePhoto}
                />
              ) : (
                <User
                  color={P.muted}
                  size={34}
                  fill={P.muted}
                  strokeWidth={1.5}
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={handleChangePhoto}
              activeOpacity={0.82}
            >
              <Camera color="#FFFFFF" size={25} strokeWidth={2.5} />
              <Text style={styles.cameraPlus}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone
                color={P.muted}
                size={24}
                fill={P.muted}
                strokeWidth={1.5}
              />
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="(555) 000-0000"
                placeholderTextColor={P.placeholder}
                value={formData.phone}
                onChangeText={handlePhoneChange}
                maxLength={14}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Home Address</Text>
            <View style={styles.inputContainer}>
              <MapPin
                color={P.muted}
                size={24}
                fill={P.muted}
                strokeWidth={1.5}
              />
              <TextInput
                style={styles.input}
                placeholder="123 Main St, Apt 4B"
                placeholderTextColor={P.placeholder}
                value={formData.address}
                onChangeText={t => setFormData({ ...formData, address: t })}
              />
            </View>
            {/* <View style={styles.helperTextContainer}>
                            <Info color={P.textSecondary} size={15} fill={P.textSecondary} strokeWidth={2} />
                            <Text style={styles.helperText}>Used for location-based alerts</Text>
                        </View> */}
          </View>

          <View style={styles.row}>
            <View style={styles.rowInputLeft}>
              <Text style={styles.label}>Height (cms)</Text>
              <View style={styles.inputContainer}>
                <ArrowUpDown color={P.muted} size={22} strokeWidth={2.2} />
                <TextInput
                  style={styles.input}
                  placeholder="170"
                  placeholderTextColor={P.placeholder}
                  value={formData.height}
                  onChangeText={t => setFormData({ ...formData, height: t })}
                />
              </View>
            </View>
            <View style={styles.rowInputRight}>
              <Text style={styles.label}>Weight (lbs)</Text>
              <View style={styles.inputContainer}>
                <Scale
                  color={P.muted}
                  size={22}
                  fill={P.muted}
                  strokeWidth={1.5}
                />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="160"
                  placeholderTextColor={P.placeholder}
                  value={formData.weight}
                  onChangeText={t => setFormData({ ...formData, weight: t })}
                />
              </View>
            </View>
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
              onPress={handleNext}
              disabled={!canSubmit || isSaving}
            >
              <Text
                style={styles.submitButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {isSaving ? 'Saving...' : 'Next: Add Emergency Contacts'}
              </Text>
              {!isSaving ? (
                <ArrowRight color="#FFFFFF" size={30} strokeWidth={2.5} />
              ) : null}
            </Pressable>

            {/* <TouchableOpacity onPress={() => navigation.navigate('AddEmergencyContacts')}>
                            <Text style={styles.skipText}>Skip for now</Text>
                        </TouchableOpacity> */}
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

  backButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 18,
  },

  progressContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: P.progressTrack,
    borderRadius: 999,
  },
  progressActive: {
    backgroundColor: P.red,
  },

  header: { marginBottom: 14 },
  stepText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.blue,
    marginBottom: 8,
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: P.textPrimary,
    marginBottom: 8,
    lineHeight: 35,
  },
  subtitle: {
    fontSize: 15,
    color: P.textSecondary,
    lineHeight: 21,
    fontWeight: '400',
  },

  photoWrapper: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 18,
    position: 'relative',
  },
  photoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F1F1EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8F8F3',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.95,
    shadowOffset: { width: -6, height: -6 },
    shadowRadius: 14,
    elevation: 1,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -6,
    backgroundColor: P.red,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: P.bg,
    shadowColor: P.red,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 8,
  },
  cameraPlus: {
    position: 'absolute',
    top: 5,
    right: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  inputGroup: { marginBottom: 12 },
  label: {
    marginBottom: 6,
    color: P.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.fieldBg,
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 48,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: P.textPrimary,
    paddingVertical: 0,
  },

  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 6,
    gap: 7,
  },
  helperText: {
    fontSize: 13,
    color: P.textSecondary,
    fontWeight: '500',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
  },
  rowInputLeft: {
    flex: 1,
    marginBottom: 0,
  },
  rowInputRight: {
    flex: 1,
    marginBottom: 0,
  },

  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 0,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: P.red,
    borderRadius: 20,
    minHeight: 58,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    shadowColor: P.red,
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.48,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    flexShrink: 1,
  },
  errorText: {
    color: P.red,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },

  skipText: {
    color: P.blue,
    fontSize: 16,
    fontWeight: '600',
  },
});
