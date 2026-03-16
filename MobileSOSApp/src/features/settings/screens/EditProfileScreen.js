import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';

const EditProfileScreen = () => {
  const [formData, setFormData] = useState({
    fullName: 'Amish Kakka',
    phone: '',
    address: '',
    height: '',
    weight: ''
  });

  const handleSave = () => {
    console.log("Saving data to MongoDB...", formData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Edit Profile</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={formData.fullName} onChangeText={(t) => setFormData({...formData, fullName: t})} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" placeholder="(555) 123-4567" onChangeText={(t) => setFormData({...formData, phone: t})} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Home Address</Text>
          <TextInput style={styles.input} placeholder="123 Main St" onChangeText={(t) => setFormData({...formData, address: t})} />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
            <Text style={styles.label}>Height</Text>
            <TextInput style={styles.input} placeholder="e.g. 5'10" onChangeText={(t) => setFormData({...formData, height: t})} />
          </View>
          <View style={[styles.inputGroup, {flex: 1}]}>
            <Text style={styles.label}>Weight (lbs)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 160" onChangeText={(t) => setFormData({...formData, weight: t})} />
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
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  saveButton: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default EditProfileScreen;