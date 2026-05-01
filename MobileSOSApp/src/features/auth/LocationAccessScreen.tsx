import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  MapPin,
  Send,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  requestBackgroundLocationPermission,
  requestForegroundLocationPermission,
} from '../../services/permissions';

type LocationAccessScreenProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
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
  warning: '#F59E0B',
  border: '#EBE7E1',
};

export default function LocationAccessScreen({
  navigation,
}: LocationAccessScreenProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllow = async () => {
    if (isRequesting) {
      return;
    }

    setIsRequesting(true);
    try {
      const foregroundGranted = await requestForegroundLocationPermission();
      if (!foregroundGranted) {
        Alert.alert(
          'Location Required',
          'SafeGuard needs foreground location access before you continue.',
        );
        return;
      }

      const backgroundGranted = await requestBackgroundLocationPermission();
      if (!backgroundGranted) {
        Alert.alert(
          'Background Location Not Enabled',
          'You can continue, but background helper availability may be limited until you allow background location.',
        );
      }

      navigation.replace('AuthScreen');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.iconRow}>
          <View style={styles.primaryIcon}>
            <MapPin color={P.blue} size={38} strokeWidth={2.5} />
          </View>
          <View style={styles.secondaryIcon}>
            <Send color={P.red} size={32} strokeWidth={2.5} />
          </View>
        </View>

        <Text style={styles.stepText}>LOCATION PERMISSION</Text>
        <Text style={styles.title}>Location Access Required</Text>
        <Text style={styles.description}>
          SafeGuard needs your location so SOS dispatch and helper discovery
          work with live coordinates.
        </Text>

        <View style={styles.warningBox}>
          <AlertTriangle color="#92400E" size={25} />
          <View style={styles.warningTextCol}>
            <Text style={styles.warningTitle}>Background Location</Text>
            <Text style={styles.warningDesc}>
              Background access improves helper availability and incident
              tracking when the app is not on screen.
            </Text>
          </View>
        </View>

        <View style={styles.bulletList}>
          {[
            'Send exact coordinates to nearby responders',
            'Keep SOS location updated during an active incident',
            'Support helper discovery when community availability is enabled',
          ].map(item => (
            <View key={item} style={styles.bulletItem}>
              <CheckCircle color={P.blue} size={18} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionBlock}>
          <TouchableOpacity
            style={styles.allowButton}
            onPress={handleAllow}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.allowButtonText}>
                  Allow Location Access
                </Text>
                <ArrowRight color="#FFFFFF" size={24} strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>

          {/* <TouchableOpacity
            onPress={() => navigation.replace('AuthScreen')}
            style={styles.skipButton}
            disabled={isRequesting}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity> */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  iconRow: { alignSelf: 'center', flexDirection: 'row', marginBottom: 30 },
  primaryIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: P.border,
  },
  secondaryIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FCE8EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -18,
    marginTop: 18,
    borderWidth: 4,
    borderColor: P.bg,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.blue,
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: P.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
  },
  description: {
    color: P.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 23,
    fontSize: 15,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF7E6',
    borderLeftWidth: 5,
    borderLeftColor: P.warning,
    padding: 16,
    borderRadius: 18,
    marginTop: 30,
    width: '100%',
  },
  warningTextCol: { marginLeft: 12, flex: 1 },
  warningTitle: { fontWeight: '900', color: '#92400E', fontSize: 15 },
  warningDesc: {
    color: '#92400E',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
    fontWeight: '500',
  },
  bulletList: { width: '100%', marginTop: 26, gap: 12 },
  bulletItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletText: {
    color: P.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    flex: 1,
  },
  actionBlock: { width: '100%', marginTop: 36 },
  allowButton: {
    backgroundColor: P.red,
    width: '100%',
    minHeight: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: P.red,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 22,
    elevation: 7,
  },
  allowButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 17 },
  skipButton: { marginTop: 20, alignSelf: 'center' },
  skipButtonText: { color: P.blue, fontWeight: '800', fontSize: 15 },
});
