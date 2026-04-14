import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Lock, MapPin, RefreshCw, Shield, Users, Zap } from 'lucide-react-native';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type GetStartedScreenProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

const features = [
  {
    icon: <MapPin color="#3B82F6" size={22} />,
    title: 'Live Location Tracking',
    desc: 'Keep your current coordinates ready for emergency response.',
  },
  {
    icon: <Zap color="#F59E0B" size={22} />,
    title: 'Instant SOS Alert',
    desc: 'Trigger nearby helper outreach with one tap.',
  },
  {
    icon: <Shield color="#10B981" size={22} />,
    title: 'Always-On Safety',
    desc: 'Stay visible to the system when an incident happens.',
  },
  {
    icon: <Users color="#8B5CF6" size={22} />,
    title: 'Emergency Contacts',
    desc: 'Notify trusted people alongside helper dispatch.',
  },
  {
    icon: <Lock color="#EF4444" size={22} />,
    title: 'Protected Actions',
    desc: 'Reduce accidental taps during stressful moments.',
  },
  {
    icon: <RefreshCw color="#10B981" size={22} />,
    title: 'Real-Time Updates',
    desc: 'Keep incident status and helper movement in sync.',
  },
];

export default function GetStartedScreen({ navigation }: GetStartedScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Shield color="#FFF" size={42} fill="#DC2626" />
          </View>
          <Text style={styles.title}>SafeGuard</Text>
          <Text style={styles.subtitle}>Emergency safety and live response.</Text>
          <View style={styles.trustBadge}>
            <Text style={styles.trustText}>Live maps. Fast dispatch. Clear status.</Text>
          </View>
        </View>

        {features.map((feature) => (
          <View key={feature.title} style={styles.card}>
            <View style={styles.iconBox}>{feature.icon}</View>
            <View style={styles.cardText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.mainButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('LocationAccess')}
        >
          <Text style={styles.mainButtonText}>Get Started</Text>
          <ChevronRight color="#FFF" size={20} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 30 },
  header: { alignItems: 'center', marginBottom: 35 },
  logoContainer: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 22,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    marginBottom: 12,
  },
  title: { fontSize: 34, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  trustBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
  },
  trustText: { color: '#166534', fontWeight: '800', fontSize: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  featureDesc: { fontSize: 13, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  mainButton: {
    backgroundColor: '#DC2626',
    width: '100%',
    padding: 20,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  mainButtonText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginRight: 8 },
});
