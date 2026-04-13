import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, Image, ScrollView, ActivityIndicator } from 'react-native';
import { ChevronRight, HeartPulse, ShieldAlert, LogOut, BellRing, UserCircle } from "lucide-react-native";
import { API_BASE_URL } from '../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';


type NavigationLike = { 
  navigate: (screen: string, params?: Record<string, any>) => void;
  replace: (screen: string) => void;
};
type SettingsScreenProps = { navigation: NavigationLike };

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  
  // Dynamic State Variables
  const [userData, setUserData] = useState({ firstName: '', lastName: '', email: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data when the screen loads
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          // Update the UI with the real database data
          setUserData({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email
          });
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#DC2626" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://via.placeholder.com/80' }} 
            style={styles.profilePic} 
          />
          <View style={styles.headerTextContainer}>
            {/* DYNAMIC DATA HERE */}
            <Text style={styles.userName}>
              {`${userData.firstName} ${userData.lastName}`}
            </Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            
            <TouchableOpacity 
              style={styles.editProfileBtn} 
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ACCOUNT SECTION */}
        <Text style={styles.sectionTitle}>ACCOUNT & DATA</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MedicalProfile')}>
            <View style={styles.iconAndText}>
              <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                <HeartPulse color="#DC2626" size={20} />
              </View>
              <Text style={styles.menuText}>Medical Profile</Text>
            </View>
            <ChevronRight color="#D1D5DB" size={20} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('HelperDashboard')}>
            <View style={styles.iconAndText}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <UserCircle color="#10B981" size={20} />
              </View>
              <Text style={styles.menuText}>Community Helper Dashboard</Text>
            </View>
            <ChevronRight color="#D1D5DB" size={20} />
          </TouchableOpacity>
        </View>

        {/* DELETE ACCOUNT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn}>
          <LogOut color="#DC2626" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Delete Account</Text>
        </TouchableOpacity>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={async () => {
             // Sign out logic: Delete the token and go back to Auth
             await AsyncStorage.removeItem('userToken');
             navigation.replace('AuthScreen');
          }}
        >
          <LogOut color="#DC2626" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' }, // Darker background to make cards pop
  scrollContent: { paddingBottom: 40 },
  
  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, backgroundColor: '#fff', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  profilePic: { width: 70, height: 70, borderRadius: 35, marginRight: 16 },
  headerTextContainer: { flex: 1 },
  userName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  userEmail: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  editProfileBtn: { backgroundColor: '#F3F4F6', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, alignSelf: 'flex-start' },
  editProfileText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  
  /* Sections */
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginLeft: 24, marginBottom: 8, letterSpacing: 1 },
  cardGroup: { backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: 16, marginBottom: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  
  /* Toggles & Menu Items */
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  iconAndText: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  
  toggleTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  toggleSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  menuText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 64 }, // Indented divider
  
  /* Logout & Footer */
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', marginHorizontal: 16, paddingVertical: 16, borderRadius: 16, marginTop: 10 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  versionText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 24, fontWeight: '500' }
});

export default SettingsScreen;