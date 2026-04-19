import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Shield, Users, MapPin, Handshake } from 'lucide-react-native';

import { getCommunityAvailabilitySnapshot } from '../../services/communityAvailability';
import type { AppUser } from '../../services/appUser';

type NavigationLike = { navigate: (screen: string, params?: Record<string, any>) => void };

type HelperDashboardScreenProps = { navigation: NavigationLike };

const HelperDashboardScreen: React.FC<HelperDashboardScreenProps> = ({ navigation }) => {
  const [session, setSession] = useState<AppUser | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [statusText, setStatusText] = useState('Preparing community helper dashboard...');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const snapshot = await getCommunityAvailabilitySnapshot();
        setSession(snapshot.session);
        setIsAvailable(snapshot.isAvailable);
        setStatusText(snapshot.statusText);
      } catch (error: any) {
        setStatusText(error?.message || 'Failed to initialize helper dashboard.');
      } finally {
        setIsBooting(false);
      }
    };

    bootstrap();
  }, []);

  if (isBooting) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Preparing helper dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Shield color="#FFF" size={28} />
          </View>
          <Text style={styles.title}>Community Helper</Text>
          <Text style={styles.subtitle}>Ready to make a difference in your community</Text>
        </View>

        <View style={[styles.card, styles.shadow]}>
          <Text style={styles.cardTitle}>
            {isAvailable ? 'Community Availability Is On' : 'Community Availability Is Off'}
          </Text>
          <Text style={styles.cardSubtitle}>{statusText}</Text>
          <Text style={styles.cardMeta}>
            {session?.email ? `Signed in as: ${session.email}` : 'Current user unavailable'}
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('SettingsHome')}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsButtonText}>Manage Availability In Settings</Text>
          </TouchableOpacity>
        </View>

        <InfoCard
          icon={<Users color="#374151" size={20} />}
          title="Community First"
          desc="Be there for your neighbors when they need help the most."
          bg="#f3f4f6"
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'community' })}
        />

        <InfoCard
          icon={<MapPin color="#DC2626" size={20} />}
          title="Location Tracking"
          desc="Location tracking is separate from helper dispatch. Availability is now controlled in Settings."
          bg="#fef2f2"
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'savelives' })}
        />

        <InfoCard
          icon={<Handshake color="#374151" size={20} />}
          title="Background Dispatch"
          desc="If community availability is on, SOS requests can reach you outside this screen."
          bg="#f3f4f6"
          onPress={() => navigation.navigate('HelperGuidelines', { openSection: 'trust' })}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

type InfoCardProps = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bg?: string;
  onPress?: () => void;
};

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, desc, bg, onPress }) => (
  <TouchableOpacity style={[styles.infoCard, styles.shadow]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.infoIconBox, { backgroundColor: bg }]}>
      {icon}
    </View>
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDesc}>{desc}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 16, fontSize: 15, color: '#374151', fontWeight: '600' },
  scroll: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  iconCircle: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#d32f2f', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  cardMeta: { fontSize: 12, color: '#9ca3af', marginTop: 12 },
  settingsButton: { marginTop: 16, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  settingsButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  infoCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  infoIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoTextContainer: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  infoDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  shadow: { shadowColor: '#9ca3af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
});

export default HelperDashboardScreen;
