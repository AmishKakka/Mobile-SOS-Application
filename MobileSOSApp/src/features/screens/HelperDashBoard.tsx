import {
  ArrowLeft,
  ArrowRight,
  Handshake,
  MapPin,
  Shield,
  Users,
} from 'lucide-react-native';
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

import type { AppUser } from '../../services/appUser';
import { getCommunityAvailabilitySnapshot } from '../../services/communityAvailability';

type NavigationLike = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
};

type HelperDashboardScreenProps = {
  navigation: NavigationLike;
};

type InfoCardProps = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: 'blue' | 'red' | 'green';
  onPress?: () => void;
};

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
};

const HelperDashboardScreen: React.FC<HelperDashboardScreenProps> = ({
  navigation,
}) => {
  const [session, setSession] = useState<AppUser | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [statusText, setStatusText] = useState(
    'Preparing community helper dashboard...',
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const snapshot = await getCommunityAvailabilitySnapshot();
        setSession(snapshot.session);
        setIsAvailable(snapshot.isAvailable);
        setStatusText(snapshot.statusText);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to initialize helper dashboard.';
        setStatusText(message);
      } finally {
        setIsBooting(false);
      }
    };

    bootstrap();
  }, []);

  if (isBooting) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={P.red} />
        <Text style={styles.loadingText}>Preparing helper dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft color={P.textPrimary} size={30} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Shield color={P.red} size={34} strokeWidth={2.4} />
          </View>
          <Text style={styles.stepText}>COMMUNITY RESPONSE</Text>
          <Text style={styles.title}>Community Helper</Text>
          <Text style={styles.subtitle}>
            Ready to make a difference in your community.
          </Text>
        </View>

        {/* <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View
              style={[
                styles.statusDot,
                isAvailable ? styles.statusDotOn : styles.statusDotOff,
              ]}
            />
            <Text style={styles.statusLabel}>
              {isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
            </Text>
          </View>
          <Text style={styles.cardTitle}>
            {isAvailable
              ? 'Community Availability Is On'
              : 'Community Availability Is Off'}
          </Text>
          <Text style={styles.cardSubtitle}>{statusText}</Text>
          <Text style={styles.cardMeta}>
            {session?.email
              ? `Signed in as: ${session.email}`
              : 'Current user unavailable'}
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('SettingsHome')}
            activeOpacity={0.85}
          >
            <Text style={styles.settingsButtonText}>
              Manage Availability In Settings
            </Text>
            <ArrowRight color="#FFFFFF" size={21} strokeWidth={2.5} />
          </TouchableOpacity>
        </View> */}

        <InfoCard
          icon={<Users color={P.blue} size={22} strokeWidth={2.3} />}
          title="Community First"
          desc="Be there for your neighbors when they need help the most."
          tone="blue"
          onPress={() =>
            navigation.navigate('HelperGuidelines', {
              openSection: 'community',
            })
          }
        />

        <InfoCard
          icon={<MapPin color={P.red} size={22} strokeWidth={2.3} />}
          title="Location Tracking"
          desc="Availability is controlled in Settings while response routes stay live during dispatch."
          tone="red"
          onPress={() =>
            navigation.navigate('HelperGuidelines', {
              openSection: 'savelives',
            })
          }
        />

        <InfoCard
          icon={<Handshake color={P.success} size={22} strokeWidth={2.3} />}
          title="Background Dispatch"
          desc="If community availability is on, SOS requests can reach you outside this screen."
          tone="green"
          onPress={() =>
            navigation.navigate('HelperGuidelines', { openSection: 'trust' })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  title,
  desc,
  tone,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.infoCard}
    onPress={onPress}
    activeOpacity={0.78}
  >
    <View style={[styles.infoIconBox, iconToneStyles[tone]]}>{icon}</View>
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDesc}>{desc}</Text>
    </View>
    <ArrowRight color={P.muted} size={20} strokeWidth={2.3} />
  </TouchableOpacity>
);

const iconToneStyles = StyleSheet.create({
  blue: { backgroundColor: '#E7F1F8' },
  red: { backgroundColor: '#FCE8EA' },
  green: { backgroundColor: '#E8F6F0' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: P.bg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: P.textSecondary,
    fontWeight: '700',
  },
  scroll: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 34 },
  backButton: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18 },
  header: { alignItems: 'flex-start', marginBottom: 22 },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
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
    fontSize: 30,
    fontWeight: '900',
    color: P.textPrimary,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: P.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: P.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusDotOn: { backgroundColor: P.success },
  statusDotOff: { backgroundColor: P.muted },
  statusLabel: {
    color: P.blue,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardTitle: { fontSize: 18, fontWeight: '900', color: P.textPrimary },
  cardSubtitle: {
    fontSize: 14,
    color: P.textSecondary,
    marginTop: 7,
    lineHeight: 20,
    fontWeight: '500',
  },
  cardMeta: { fontSize: 12, color: P.muted, marginTop: 12, fontWeight: '600' },
  settingsButton: {
    marginTop: 16,
    backgroundColor: P.red,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  settingsButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: P.card,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: { flex: 1, minWidth: 0 },
  infoTitle: { fontSize: 16, fontWeight: '900', color: P.textPrimary },
  infoDesc: {
    fontSize: 13,
    color: P.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default HelperDashboardScreen;
