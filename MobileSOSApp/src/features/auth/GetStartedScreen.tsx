import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  Lock,
  MapPin,
  RefreshCw,
  Shield,
  Users,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type GetStartedScreenProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

type Feature = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: 'blue' | 'red' | 'green' | 'amber';
};

const ONBOARDING_SEEN_KEY = '@safeguard_has_seen_get_started';

const P = {
  bg: '#FAF9F6',
  card: '#FFFFFF',
  fieldBg: '#F4F4F0',
  textPrimary: '#111111',
  textSecondary: '#4E3F3F',
  muted: '#8F6E70',
  red: '#C8102E',
  blue: '#155E8A',
  border: '#EBE7E1',
  success: '#0F9F6E',
  amber: '#B7791F',
};

const features: Feature[] = [
  {
    icon: <MapPin color={P.blue} size={22} strokeWidth={2.3} />,
    title: 'Live Location Tracking',
    desc: 'Keep your current coordinates ready for emergency response.',
    tone: 'blue',
  },
  {
    icon: <Zap color={P.red} size={22} strokeWidth={2.3} />,
    title: 'Instant SOS Alert',
    desc: 'Trigger nearby helper outreach with one tap.',
    tone: 'red',
  },
  {
    icon: <Shield color={P.success} size={22} strokeWidth={2.3} />,
    title: 'Always-On Safety',
    desc: 'Stay visible to the system when an incident happens.',
    tone: 'green',
  },
  {
    icon: <Users color={P.blue} size={22} strokeWidth={2.3} />,
    title: 'Emergency Contacts',
    desc: 'Notify trusted people alongside helper dispatch.',
    tone: 'blue',
  },
  {
    icon: <Lock color={P.red} size={22} strokeWidth={2.3} />,
    title: 'Protected Actions',
    desc: 'Reduce accidental taps during stressful moments.',
    tone: 'red',
  },
  {
    icon: <RefreshCw color={P.amber} size={22} strokeWidth={2.3} />,
    title: 'Real-Time Updates',
    desc: 'Keep incident status and helper movement in sync.',
    tone: 'amber',
  },
];

export default function GetStartedScreen({
  navigation,
}: GetStartedScreenProps) {
  const handleGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    navigation.replace('LocationAccess');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Shield color={P.red} size={42} strokeWidth={2.3} />
          </View>
          <Text style={styles.stepText}>MOBILE SOS</Text>
          <Text style={styles.title}>SafeGuard</Text>
          <Text style={styles.subtitle}>
            Emergency safety and live response when every second matters.
          </Text>
          <View style={styles.trustBadge}>
            <Text style={styles.trustText}>
              Live maps. Fast dispatch. Clear status.
            </Text>
          </View>
        </View>

        <View style={styles.featureGrid}>
          {features.map(feature => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </View>

        <TouchableOpacity
          style={styles.mainButton}
          activeOpacity={0.85}
          onPress={handleGetStarted}
        >
          <Text style={styles.mainButtonText}>Get Started</Text>
          <ArrowRight color="#FFFFFF" size={25} strokeWidth={2.5} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, iconToneStyles[feature.tone]]}>
        {feature.icon}
      </View>
      <View style={styles.cardText}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDesc}>{feature.desc}</Text>
      </View>
    </View>
  );
}

const iconToneStyles = StyleSheet.create({
  blue: { backgroundColor: '#E7F1F8' },
  red: { backgroundColor: '#FCE8EA' },
  green: { backgroundColor: '#E8F6F0' },
  amber: { backgroundColor: '#FFF7E6' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  content: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 30 },
  header: { alignItems: 'center', marginBottom: 26 },
  logoContainer: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.blue,
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: P.textPrimary,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: P.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 23,
  },
  trustBadge: {
    backgroundColor: '#E8F6F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    marginTop: 14,
  },
  trustText: { color: P.success, fontWeight: '900', fontSize: 12 },
  featureGrid: { marginBottom: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: P.card,
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardText: { flex: 1, minWidth: 0 },
  featureTitle: { fontSize: 15, fontWeight: '900', color: P.textPrimary },
  featureDesc: {
    fontSize: 13,
    color: P.textSecondary,
    marginTop: 3,
    fontWeight: '500',
    lineHeight: 18,
  },
  mainButton: {
    backgroundColor: P.red,
    width: '100%',
    minHeight: 62,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
    shadowColor: P.red,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 22,
    elevation: 7,
  },
  mainButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
});
