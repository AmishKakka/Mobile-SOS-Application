import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertTriangle, Send } from 'lucide-react-native';
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

export default function LocationAccessScreen({ navigation }: LocationAccessScreenProps) {
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
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.iconRow}>
          <View style={styles.blueIcon}>
            <Send color="#3B82F6" size={36} />
          </View>
          <View style={[styles.blueIcon, styles.backIcon]}>
            <AlertTriangle color="#1D4ED8" size={36} />
          </View>
        </View>

        <Text style={styles.title}>Location Access Required</Text>
        <Text style={styles.description}>
          SafeGuard needs your device location so SOS dispatch and helper discovery work with live coordinates.
        </Text>

        <View style={styles.warningBox}>
          <AlertTriangle color="#B45309" size={26} />
          <View style={styles.warningTextCol}>
            <Text style={styles.warningTitle}>Background Location</Text>
            <Text style={styles.warningDesc}>
              Background access improves helper availability and incident tracking when the app is not on screen.
            </Text>
          </View>
        </View>

        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Send exact coordinates to nearby responders</Text>
          <Text style={styles.bulletItem}>• Keep SOS location updated during an active incident</Text>
          <Text style={styles.bulletItem}>• Support helper discovery when community availability is enabled</Text>
        </View>

        <View style={styles.actionBlock}>
          <TouchableOpacity style={styles.allowButton} onPress={handleAllow} disabled={isRequesting}>
            {isRequesting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.allowButtonText}>Allow Location Access</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.replace('AuthScreen')}
            style={styles.skipButton}
            disabled={isRequesting}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  iconRow: { flexDirection: 'row', marginBottom: 25 },
  blueIcon: {
    backgroundColor: '#EFF6FF',
    padding: 22,
    borderRadius: 100,
    elevation: 5,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  backIcon: {
    marginLeft: -18,
    backgroundColor: '#DBEAFE',
    zIndex: -1,
  },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', textAlign: 'center' },
  description: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 5,
    borderLeftColor: '#F59E0B',
    padding: 18,
    borderRadius: 15,
    marginTop: 35,
    width: '100%',
  },
  warningTextCol: { marginLeft: 14, flex: 1 },
  warningTitle: { fontWeight: '800', color: '#92400E', fontSize: 15 },
  warningDesc: {
    color: '#B45309',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  bulletList: { width: '100%', marginTop: 30 },
  bulletItem: {
    color: '#374151',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
    paddingLeft: 10,
  },
  actionBlock: { width: '100%' },
  allowButton: {
    backgroundColor: '#3B82F6',
    width: '100%',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 45,
    elevation: 6,
    minHeight: 62,
  },
  allowButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  skipButton: { marginTop: 22, alignSelf: 'center' },
  skipButtonText: { color: '#9CA3AF', fontWeight: '800', fontSize: 14 },
});
