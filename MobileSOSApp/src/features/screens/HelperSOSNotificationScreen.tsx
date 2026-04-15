import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { AlertTriangle, MapPin, User, X, Check } from 'lucide-react-native';

import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import {
  getActiveDeviceRole,
  getOrCreateDemoSession,
} from '../../services/demoSession';
import { getHelperModeState } from '../../services/helperMode';
import { registerSocketUser, getSocket } from '../../services/socketService';

const { width } = Dimensions.get('window');

type SOSParams = {
  roomId: string;
  victimUserId: string;
  victimName: string;
  victimLocation: { lat: number; lng: number };
  helperDistanceMeters?: number;
  incidentType?: string;
};

type Props = {
  navigation: NativeStackNavigationProp<ParamListBase>;
  route: RouteProp<{ params: SOSParams }, 'params'>;
};

function formatDistance(distanceMeters?: number) {
  if (distanceMeters === undefined) {
    return 'Nearby';
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

export default function HelperSOSNotificationScreen({ navigation, route }: Props) {
  const {
    roomId,
    victimName,
    victimLocation,
    helperDistanceMeters,
    incidentType = 'Emergency',
  } = route.params;

  const [helperSession, setHelperSession] = useState<{ userId: string; name: string } | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Promise.all([
      getActiveDeviceRole(),
      getOrCreateDemoSession('helper', 'Community Helper'),
      getHelperModeState(),
    ]).then(([activeRole, session, helperMode]) => {
      if (!session || activeRole !== 'helper' || !helperMode.isAvailable) {
        Alert.alert('Helper mode inactive', 'This device is not currently acting as a helper.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('HelperDashboard'),
          },
        ]);
        return;
      }

      setHelperSession(session);
      registerSocketUser(session.userId, 'helper', session.name);
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, navigation, pulseAnim, slideAnim]);

  const handleAccept = () => {
    if (!helperSession || isAccepting) {
      return;
    }

    setIsAccepting(true);
    const socket = getSocket();
    socket.emit(
      'helper_accept',
      {
        roomId,
        helperId: helperSession.userId,
        helperName: helperSession.name,
      },
      (response: any) => {
        setIsAccepting(false);

        if (!response?.ok) {
          Alert.alert(
            'Unable to accept incident',
            response?.message || 'This SOS is no longer available.',
          );
          return;
        }

        navigation.replace('HelperTracking', {
          roomId,
          helperId: helperSession.userId,
          helperName: helperSession.name,
          victimName,
          victimLocation: {
            latitude: victimLocation.lat,
            longitude: victimLocation.lng,
          },
          incidentType: response.incidentType || incidentType,
        });
      },
    );
  };

  const handleReject = () => {
    if (helperSession) {
      getSocket().emit('helper_reject', {
        roomId,
        helperId: helperSession.userId,
      });
    }
    navigation.popTo('MainDashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Animated.View style={[styles.alertIconCircle, { transform: [{ scale: pulseAnim }] }]}>
            <AlertTriangle color="#FFF" size={32} />
          </Animated.View>
          <Text style={styles.headerTitle}>SOS ALERT</Text>
          <Text style={styles.headerSub}>This alert is live. Stop pretending it is a test flow.</Text>
        </View>

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.victimRow}>
            <View style={styles.avatarCircle}>
              <User color="#FFF" size={24} />
            </View>
            <View style={styles.victimInfo}>
              <Text style={styles.victimName}>{victimName}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <MapPin color="#DC2626" size={14} />
                  <Text style={styles.badgeText}>{formatDistance(helperDistanceMeters)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Incident</Text>
            <Text style={styles.infoValue}>{incidentType}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Room</Text>
            <Text style={styles.infoValue}>{roomId}</Text>
          </View>

          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              pointerEvents="none"
              initialRegion={{
                latitude: victimLocation.lat,
                longitude: victimLocation.lng,
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
              }}
            >
              <Marker
                coordinate={{ latitude: victimLocation.lat, longitude: victimLocation.lng }}
                pinColor="#DC2626"
                title={victimName}
                description="Victim live location"
              />
            </MapView>
          </View>
        </Animated.View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleAccept}
            disabled={isAccepting}
          >
            <Check color="#FFF" size={22} />
            <Text style={styles.acceptButtonText}>
              {isAccepting ? 'Confirming...' : 'Accept & Respond'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rejectButton} activeOpacity={0.8} onPress={handleReject}>
            <X color="#6B7280" size={20} />
            <Text style={styles.rejectButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  alertIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  victimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  victimInfo: {
    flex: 1,
    minWidth: 0,
  },
  victimName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  infoLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  infoValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  mapWrap: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    width: width - 80,
    height: 220,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginBottom: 12,
  },
  acceptButtonDisabled: {
    opacity: 0.72,
  },
  acceptButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  rejectButtonText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 15,
  },
});
