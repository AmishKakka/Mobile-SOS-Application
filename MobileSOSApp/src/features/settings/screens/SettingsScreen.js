import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, Image } from 'react-native';

const SettingsScreen = ({ navigation }) => {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: 'https://via.placeholder.com/80' }} 
          style={styles.profilePic} 
        />
        <Text style={styles.userName}>Justin Mason</Text>
        <Text style={styles.userEmail}>justin@example.com</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>Community Availability</Text>
            <Text style={styles.toggleSub}>Currently {isAvailable ? 'Available' : 'Do Not Disturb'}</Text>
          </View>
          <Switch 
            value={isAvailable} 
            onValueChange={setIsAvailable} 
            trackColor={{ false: '#e5e7eb', true: '#fca5a5' }}
            thumbColor={isAvailable ? '#dc2626' : '#f3f4f6'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.menuText}>Edit Personal Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EmergencyContacts')}>
          <Text style={styles.menuText}>Emergency Contacts (0/5)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Medical Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.menuItem, styles.helperItem]} 
          onPress={() => navigation.navigate('HelperDashboard')}
        >
          <Text style={styles.helperText}>Community Helper Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { alignItems: 'center', padding: 30, backgroundColor: '#fff', marginBottom: 20 },
  profilePic: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  userEmail: { fontSize: 14, color: '#6b7280' },
  section: { backgroundColor: '#fff', marginBottom: 20, paddingVertical: 10 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  toggleTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  toggleSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  menuItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuText: { fontSize: 16, color: '#1f2937', fontWeight: '500' },
  helperItem: { backgroundColor: '#fef2f2', borderBottomWidth: 0 },
  helperText: { fontSize: 16, color: '#dc2626', fontWeight: '700', textAlign: 'center' }
});

export default SettingsScreen;