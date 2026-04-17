import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../../config/config';
import { fetchAuthSession } from 'aws-amplify/auth';

type NavigationLike = { goBack: () => void };
type Props = { navigation: NavigationLike };

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Initialize with empty strings instead of static data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    height: '',
    weight: ''
  });

  // FETCH PROFILE DATA ON LOAD
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
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
            weight: data.weight || ''
          });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // AUTO-FORMATTER for the phone number field
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 10);
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length > 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    setFormData({ ...formData, phone: formatted });
  };

  // Ensure First Name, Last Name, and a 10-digit Phone are present
  const canSubmit = useMemo(() => {
    const rawDigits = formData.phone ? formData.phone.replace(/\D/g, '') : '';
    return (
      rawDigits.length === 10 && 
      formData.firstName.trim().length > 0 && 
      formData.lastName.trim().length > 0
    );
  }, [formData.phone, formData.firstName, formData.lastName]);

  // SAVE CHANGES TO MONGODB
  const handleSave = async () => {
    if (!canSubmit) return;
    setErrorMessage(""); // Clear previous errors

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigation.goBack(); // Instant navigation without pop-up
      } else {
        const err = await response.json();
        setErrorMessage(err.message || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Save Crash:", error);
      setErrorMessage("Network Error. Could not connect to the server.");
    }
  };

  const handleChangePhoto = () => {
    console.log("Trigger OS Image Picker...");
  };

  // Show a loading spinner while fetching data
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#DC2626" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Edit Profile</Text>
        
        {/* User's Image (Profile) */}
        <View style={styles.photoContainer}>
          <Image 
            source={{ uri: 'https://via.placeholder.com/100' }} 
            style={styles.profilePic} 
          />
          <TouchableOpacity onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* First Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput 
            style={styles.input} 
            value={formData.firstName} 
            onChangeText={(t) => setFormData({...formData, firstName: t})} 
          />
        </View>

        {/* Last Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput 
            style={styles.input} 
            value={formData.lastName} 
            onChangeText={(t) => setFormData({...formData, lastName: t})} 
          />
        </View>

        {/* Email Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="email-address" 
            autoCapitalize="none"
            value={formData.email} 
            onChangeText={(t) => setFormData({...formData, email: t})} 
            // Optional: add editable={false} if you don't want users changing their login email here
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="phone-pad" 
            value={formData.phone} 
            onChangeText={handlePhoneChange} 
            maxLength={14}
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Home Address</Text>
          <TextInput 
            style={styles.input} 
            value={formData.address} 
            onChangeText={(t) => setFormData({...formData, address: t})} 
          />
        </View>

        {/* Height/Weight */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
            <Text style={styles.label}>Height</Text>
            <TextInput 
              style={styles.input} 
              value={formData.height} 
              onChangeText={(t) => setFormData({...formData, height: t})} 
            />
          </View>
          <View style={[styles.inputGroup, {flex: 1}]}>
            <Text style={styles.label}>Weight (lbs)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={formData.weight} 
              onChangeText={(t) => setFormData({...formData, weight: t})} 
            />
          </View>
        </View>

        {/* Inline Error Message Replacement for Alert */}
        {errorMessage !== "" && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <TouchableOpacity 
          style={[styles.saveButton, !canSubmit && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!canSubmit}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 24 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 24 },
  
  // Profile Photo Styles
  photoContainer: { alignItems: 'center', marginBottom: 24 },
  profilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: '#f3f4f6' },
  changePhotoText: { color: '#d32f2f', fontSize: 15, fontWeight: '600' },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 16, fontSize: 16, color: '#111827', backgroundColor: '#f9fafb' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 10 },

  saveButton: { backgroundColor: '#d32f2f', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  saveButtonDisabled: { backgroundColor: "#fca5a5" },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});

export default EditProfileScreen;