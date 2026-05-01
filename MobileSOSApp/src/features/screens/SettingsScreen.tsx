import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'aws-amplify/auth';
import {
  ChevronRight,
  HeartPulse,
  LogOut,
  Pencil,
  ShieldAlert,
  UserCircle,
  Users,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getCommunityAvailabilitySnapshot,
  setCommunityAvailability,
} from '../../services/communityAvailability';

type NavigationLike = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  replace: (screen: string) => void;
  reset: (state: { index: number; routes: { name: string }[] }) => void;
};

type SettingsScreenProps = {
  navigation: NavigationLike;
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

const switchTrackColor = { false: '#EDEDE8', true: '#F2B5BE' };

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [statusText, setStatusText] = useState('Loading availability...');
  const [userName, setUserName] = useState('SafeGuard User');
  const [userEmail, setUserEmail] = useState('loading@safeguard.app');
  const [isBusy, setIsBusy] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettingsSnapshot = useCallback(async () => {
    setIsBusy(true);
    try {
      const snapshot = await getCommunityAvailabilitySnapshot();
      setIsAvailable(snapshot.isAvailable);
      setStatusText(snapshot.statusText);
      setUserName(snapshot.session.name);
      setUserEmail(snapshot.session.email);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load community availability.';
      setStatusText(message);
    } finally {
      setIsLoading(false);
      setIsBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettingsSnapshot();
    }, [loadSettingsSnapshot]),
  );

  const onToggleAvailability = async (nextValue: boolean) => {
    setIsBusy(true);
    try {
      const result = await setCommunityAvailability(nextValue);
      setIsAvailable(result.isAvailable);
      setStatusText(result.statusText);
      setUserName(result.session.name);
      setUserEmail(result.session.email);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update community availability.';
      setStatusText(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'AuthScreen' }],
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Sign out failed', message);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={P.red} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepText}>SETTINGS</Text>
        <Text style={styles.title}>Your Account</Text>
        <Text style={styles.subtitle}>
          Manage responder details, safety preferences, and account access.
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <UserCircle color={P.muted} size={46} strokeWidth={1.6} />
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {userEmail}
            </Text>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}
            >
              <Pencil color={P.blue} size={14} strokeWidth={2.4} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.cardGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.iconAndText}>
              <View style={styles.blueIconBox}>
                <ShieldAlert color={P.blue} size={21} strokeWidth={2.3} />
              </View>
              <View style={styles.textColumn}>
                <Text style={styles.toggleTitle}>Community Availability</Text>
                <Text style={styles.toggleSub}>
                  {isBusy ? 'Updating...' : statusText}
                </Text>
              </View>
            </View>
            {isBusy ? (
              <ActivityIndicator size="small" color={P.red} />
            ) : (
              <Switch
                value={isAvailable}
                onValueChange={onToggleAvailability}
                trackColor={switchTrackColor}
                thumbColor={isAvailable ? P.red : '#FFFFFF'}
              />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT & DATA</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MedicalProfile')}
          >
            <View style={styles.iconAndText}>
              <View style={styles.redIconBox}>
                <HeartPulse color={P.red} size={21} strokeWidth={2.3} />
              </View>
              <Text style={styles.menuText}>Medical Profile</Text>
            </View>
            <ChevronRight color={P.muted} size={21} strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('HelperDashboard')}
          >
            <View style={styles.iconAndText}>
              <View style={styles.greenIconBox}>
                <Users color={P.success} size={21} strokeWidth={2.3} />
              </View>
              <Text style={styles.menuText}>Community Helper Dashboard</Text>
            </View>
            <ChevronRight color={P.muted} size={21} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <LogOut color={P.red} size={19} strokeWidth={2.4} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
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
    marginBottom: 20,
    lineHeight: 22,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileTextContainer: { flex: 1, minWidth: 0 },
  userName: { fontSize: 21, fontWeight: '900', color: P.textPrimary },
  userEmail: {
    fontSize: 14,
    color: P.textSecondary,
    marginTop: 3,
    marginBottom: 10,
    fontWeight: '500',
  },
  editProfileBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: P.fieldBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  editProfileText: { fontSize: 13, fontWeight: '800', color: P.blue },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: P.blue,
    marginBottom: 10,
    letterSpacing: 1,
  },
  cardGroup: {
    backgroundColor: P.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 26,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  iconAndText: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  blueIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#E7F1F8',
  },
  redIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FCE8EA',
  },
  greenIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#E8F6F0',
  },
  textColumn: { flex: 1, minWidth: 0 },
  toggleTitle: { fontSize: 16, fontWeight: '800', color: P.textPrimary },
  toggleSub: {
    fontSize: 13,
    color: P.textSecondary,
    marginTop: 3,
    fontWeight: '500',
    lineHeight: 18,
  },
  menuText: { fontSize: 16, fontWeight: '800', color: P.textPrimary, flex: 1 },
  divider: { height: 1, backgroundColor: P.border, marginLeft: 68 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE8EA',
    minHeight: 58,
    borderRadius: 18,
    gap: 8,
    marginTop: 2,
  },
  logoutText: { fontSize: 16, fontWeight: '900', color: P.red },
});

export default SettingsScreen;
