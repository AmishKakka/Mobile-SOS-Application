import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  ArrowLeft,
  ArrowUpDown,
  Camera,
  Mail,
  MapPin,
  Phone,
  Save,
  Scale,
  User,
} from 'lucide-react-native';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';

import { API_BASE_URL } from '../../config/config';

type NavigationLike = { goBack: () => void };
type Props = { navigation: NavigationLike };

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
};

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    height: '',
    weight: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            height: data.height || '',
            weight: data.weight || '',
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

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
    const rawDigits = formData.phone ? formData.phone.replace(/\D/g, '') : '';
    return (
      rawDigits.length === 10 &&
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0
    );
  }, [formData.phone, formData.firstName, formData.lastName]);

  const handlePhotoResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) return;
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
    handlePhotoResponse(
      await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.85,
        maxWidth: 900,
        maxHeight: 900,
      }),
    );
  };

  const handleTakePhoto = async () => {
    handlePhotoResponse(
      await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.85,
        maxWidth: 900,
        maxHeight: 900,
      }),
    );
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Profile photo',
      'Choose how you want to update your profile picture.',
      [
        { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleSave = async () => {
    if (!canSubmit || isSaving) return;
    setErrorMessage('');

    try {
      setIsSaving(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const updatePayload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone,
        address: formData.address,
        height: formData.height,
        weight: formData.weight,
      };

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        navigation.goBack();
      } else {
        const errorText = await response.text();
        let nextErrorMessage = 'Failed to update profile.';

        try {
          const err = errorText ? JSON.parse(errorText) : null;
          nextErrorMessage = err?.message || err?.error || nextErrorMessage;
        } catch {
          nextErrorMessage = errorText || nextErrorMessage;
        }

        setErrorMessage(nextErrorMessage);
      }
    } catch (error) {
      console.error('Save Crash:', error);
      setErrorMessage('Network error. Could not connect to the server.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={P.red} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color={P.textPrimary} size={30} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.stepText}>ACCOUNT DETAILS</Text>
        <Text style={styles.title}>Edit Profile</Text>
        <Text style={styles.subtitle}>
          Keep your responder-facing information accurate and easy to identify.
        </Text>

        <View style={styles.photoContainer}>
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
          >
            <Camera color="#FFFFFF" size={22} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={styles.rowInputLeft}>
            <Text style={styles.label}>First Name *</Text>
            <View style={styles.inputContainer}>
              <User color={P.muted} size={20} />
              <TextInput
                style={styles.input}
                value={formData.firstName}
                placeholder="First name"
                placeholderTextColor={P.placeholder}
                onChangeText={t => setFormData({ ...formData, firstName: t })}
              />
            </View>
          </View>
          <View style={styles.rowInputRight}>
            <Text style={styles.label}>Last Name *</Text>
            <View style={styles.inputContainer}>
              <User color={P.muted} size={20} />
              <TextInput
                style={styles.input}
                value={formData.lastName}
                placeholder="Last name"
                placeholderTextColor={P.placeholder}
                onChangeText={t => setFormData({ ...formData, lastName: t })}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Mail color={P.muted} size={20} />
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              placeholder="name@example.com"
              placeholderTextColor={P.placeholder}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.inputContainer}>
            <Phone color={P.muted} size={20} />
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={formData.phone}
              placeholder="(555) 000-0000"
              placeholderTextColor={P.placeholder}
              onChangeText={handlePhoneChange}
              maxLength={14}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Home Address</Text>
          <View style={styles.inputContainer}>
            <MapPin color={P.muted} size={20} />
            <TextInput
              style={styles.input}
              value={formData.address}
              placeholder="123 Main St, Apt 4B"
              placeholderTextColor={P.placeholder}
              onChangeText={t => setFormData({ ...formData, address: t })}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowInputLeft}>
            <Text style={styles.label}>Height (cms)</Text>
            <View style={styles.inputContainer}>
              <ArrowUpDown color={P.muted} size={20} />
              <TextInput
                style={styles.input}
                value={formData.height}
                placeholder="170"
                placeholderTextColor={P.placeholder}
                onChangeText={t => setFormData({ ...formData, height: t })}
              />
            </View>
          </View>
          <View style={styles.rowInputRight}>
            <Text style={styles.label}>Weight (lbs)</Text>
            <View style={styles.inputContainer}>
              <Scale color={P.muted} size={20} />
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formData.weight}
                placeholder="160"
                placeholderTextColor={P.placeholder}
                onChangeText={t => setFormData({ ...formData, weight: t })}
              />
            </View>
          </View>
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!canSubmit || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!canSubmit || isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
          {!isSaving ? <Save color="#FFFFFF" size={22} /> : null}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 34 },
  backButton: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18 },
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
    fontSize: 15,
    color: P.textSecondary,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 18,
  },
  photoContainer: {
    alignSelf: 'center',
    marginVertical: 14,
    position: 'relative',
  },
  photoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhoto: { width: '100%', height: '100%', borderRadius: 52 },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -6,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: P.red,
    borderWidth: 4,
    borderColor: P.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: P.textPrimary,
    marginBottom: 7,
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
  input: { flex: 1, fontSize: 16, color: P.textPrimary, paddingVertical: 0 },
  row: { flexDirection: 'row', gap: 14 },
  rowInputLeft: { flex: 1, marginBottom: 14 },
  rowInputRight: { flex: 1, marginBottom: 14 },
  errorText: {
    color: P.red,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: P.red,
    minHeight: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    marginBottom: 10,
    shadowColor: P.red,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 22,
    elevation: 7,
  },
  saveButtonDisabled: { opacity: 0.48 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
});

export default EditProfileScreen;
