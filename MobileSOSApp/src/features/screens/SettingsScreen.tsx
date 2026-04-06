import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, Image, ScrollView } from 'react-native';
import { ChevronRight, HeartPulse, ShieldAlert, LogOut, BellRing, UserCircle } from "lucide-react-native";

type NavigationLike = { navigate: (screen: string, params?: Record<string, any>) => void };

type SettingsScreenProps = { navigation: NavigationLike };

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [notifications, setNotifications] = useState(true);

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
            <Text style={styles.userName}>Amish Kakka</Text>
            <Text style={styles.userEmail}>amishkakka@gmail.com</Text>
            <TouchableOpacity 
              style={styles.editProfileBtn} 
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* <Text style={styles.sectionTitle}>PREFERENCES</Text> */}
        {/* <View style={styles.cardGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.iconAndText}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <ShieldAlert color="#3B82F6" size={20} />
              </View>
              <View>
                <Text style={styles.toggleTitle}>Community Availability</Text>
                <Text style={styles.toggleSub}>Currently {isAvailable ? 'Available' : 'Do Not Disturb'}</Text>
              </View>
            </View>
            <Switch 
              value={isAvailable} 
              onValueChange={setIsAvailable} 
              trackColor={{ false: '#e5e7eb', true: '#fca5a5' }}
              thumbColor={isAvailable ? '#dc2626' : '#f3f4f6'}
            />
          </View>
          <View style={styles.divider} />
        </View> */}

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
        <TouchableOpacity style={styles.logoutBtn}>
          <LogOut color="#DC2626" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>MobileSOS App v1.0.4</Text>

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