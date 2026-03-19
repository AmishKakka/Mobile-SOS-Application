import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image } from 'react-native';

const EditProfileScreen = () => {
  const [formData, setFormData] = useState({
    fullName: 'Amish Kakka',
    email: 'amishkakka@gmail.com',
    phone: '(555) 123-4567',
    address: '123 Main St, Tempe, AZ',
    height: "5'11",
    weight: '160'
  });

  const handleSave = () => {
    console.log("Saving complete profile to MongoDB...", formData);
  };

  const handleChangePhoto = () => {
    console.log("Trigger OS Image Picker...");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Edit Profile</Text>
        
        {/*  User's Image (Profile) */}
        <View style={styles.photoContainer}>
          <Image 
            source={{ uri: 'https://via.placeholder.com/100' }} 
            style={styles.profilePic} 
          />
          <TouchableOpacity onPress={handleChangePhoto}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            value={formData.fullName} 
            onChangeText={(t) => setFormData({...formData, fullName: t})} 
          />
        </View>

        {/* Phone/Email (Email Added!) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="email-address" 
            autoCapitalize="none"
            value={formData.email} 
            onChangeText={(t) => setFormData({...formData, email: t})} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="phone-pad" 
            value={formData.phone} 
            onChangeText={(t) => setFormData({...formData, phone: t})} 
          />
        </View>

        {/*  Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Home Address</Text>
          <TextInput 
            style={styles.input} 
            value={formData.address} 
            onChangeText={(t) => setFormData({...formData, address: t})} 
          />
        </View>

        {/*  Height/Weight */}
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

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
  
  saveButton: { backgroundColor: '#d32f2f', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 40 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});

export default EditProfileScreen;