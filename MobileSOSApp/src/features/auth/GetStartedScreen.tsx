import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { MapPin, Zap, Shield, Users, Lock, RefreshCw, ChevronRight } from 'lucide-react-native';

const features = [
  { icon: <MapPin color="#3B82F6" size={22} />, title: 'Live Location Tracking', desc: 'Share your real-time GPS coordinates' },
  { icon: <Zap color="#F59E0B" size={22} />, title: 'Instant SOS Alert', desc: 'Trigger emergency alerts with one tap' },
  { icon: <Shield color="#10B981" size={22} />, title: '24/7 Protection', desc: 'Always-on safety monitoring' },
  { icon: <Users color="#8B5CF6" size={22} />, title: 'Emergency Contacts', desc: 'Automatically notify your trusted contacts' },
  { icon: <Lock color="#EF4444" size={22} />, title: 'PIN Protection', desc: 'Prevent accidental cancellation' },
  { icon: <RefreshCw color="#10B981" size={22} />, title: 'Real-time Updates', desc: 'Live status via Socket.io' },
];

export default function GetStartedScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Shield color="#FFF" size={42} fill="#DC2626" />
          </View>
          <Text style={styles.title}>SafeGuard</Text>
          <Text style={styles.subtitle}>Emergency Safety App</Text>
          <View style={styles.trustBadge}>
            <Text style={styles.trustText}>✓ Trusted by 10K+ Users</Text>
          </View>
        </View>

        {features.map((f, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.iconBox}>{f.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fTitle}>{f.title}</Text>
              <Text style={styles.fDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.mainBtn}
          onPress={() => navigation.navigate('LocationAccess')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Get Started</Text>
          <ChevronRight color="#FFF" size={20} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content:   { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 30 },
  header:    { alignItems: 'center', marginBottom: 35 },
  logoContainer: {
    backgroundColor: '#FFF', padding: 12, borderRadius: 22,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 }, marginBottom: 12,
  },
  title:      { fontSize: 34, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  subtitle:   { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  trustBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 12 },
  trustText:  { color: '#166534', fontWeight: '800', fontSize: 12 },
  card: {
    flexDirection: 'row', backgroundColor: '#FFF', padding: 16,
    borderRadius: 20, marginBottom: 14, alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  fTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  fDesc:  { fontSize: 13, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  mainBtn: {
    backgroundColor: '#DC2626', width: '100%', padding: 20, borderRadius: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 15, elevation: 8,
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginRight: 8 },
});
