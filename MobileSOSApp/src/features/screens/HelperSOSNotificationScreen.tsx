import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { AlertTriangle, MapPin, Clock, User, X, Check } from 'lucide-react-native';

import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type SOSParams = {
  victimName: string;
  victimLocation: { latitude: number; longitude: number };
  distance: string;
  incidentType: string;
};

type Props = {
  navigation: NativeStackNavigationProp<ParamListBase>;
  route: RouteProp<{ params: SOSParams }, 'params'>;
};

export default function HelperSOSNotificationScreen({ navigation, route }: Props) {
  const {
    victimName = 'Sarah M.',
    victimLocation = { latitude: 33.4152, longitude: -111.9263 },
    distance = '0.8 km',
    incidentType = 'Medical Emergency',
  } = route.params ?? {};

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
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
  }, []);

  const handleAccept = () => {
    navigation.replace('HelperTracking', {
      victimName,
      victimLocation,
      distance,
      incidentType,
    });
  };

  const handleReject = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Urgency header */}
      <View style={styles.header}>
        <Animated.View style={[styles.alertIconCircle, { transform: [{ scale: pulseAnim }] }]}>
          <AlertTriangle color="#FFF" size={32} />
        </Animated.View>
        <Text style={styles.headerTitle}>EMERGENCY SOS</Text>
        <Text style={styles.headerSub}>Someone nearby needs your help</Text>
      </View>

      {/* Victim info card */}
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.victimRow}>
          <View style={styles.avatarCircle}>
            <User color="#FFF" size={24} />
          </View>
          <View style={styles.victimInfo}>
            <Text style={styles.victimName}>{victimName}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <AlertTriangle color="#DC2626" size={12} />
                <Text style={styles.badgeText}>{incidentType}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MapPin color="#6B7280" size={16} />
            <Text style={styles.detailText}>{distance} away</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock color="#6B7280" size={16} />
            <Text style={styles.detailText}>Just now</Text>
          </View>
        </View>
      </Animated.View>

      {/* Map preview */}
      <Animated.View style={[styles.mapContainer, { opacity: fadeAnim }]}>
        <MapView
          style={styles.map}
          initialRegion={{
            ...victimLocation,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Marker coordinate={victimLocation} pinColor="#DC2626" />
        </MapView>
        <View style={styles.mapOverlayLabel}>
          <MapPin color="#DC2626" size={14} />
          <Text style={styles.mapOverlayText}>Victim Location</Text>
        </View>
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.acceptButton}
          activeOpacity={0.8}
          onPress={handleAccept}
        >
          <Check color="#FFF" size={22} />
          <Text style={styles.acceptButtonText}>Accept & Respond</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rejectButton}
          activeOpacity={0.8}
          onPress={handleReject}
        >
          <X color="#6B7280" size={20} />
          <Text style={styles.rejectButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },

  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
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
  },
  victimName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },

  mapContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlayLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: '#16A34A',
    paddingVertical: 18,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  rejectButton: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  rejectButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
  },
});
