import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  User,
} from 'lucide-react-native';

import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type CompletionParams = {
  victimName: string;
  responseTime: string;
  distanceCovered: string;
  outcome: 'helped' | 'cannot_handle';
  notes: string;
};

type Props = {
  navigation: NativeStackNavigationProp<ParamListBase>;
  route: RouteProp<{ params: CompletionParams }, 'params'>;
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
  amber: '#B7791F',
};

export default function SOSCompletionScreen({ navigation, route }: Props) {
  const {
    victimName = 'Sarah M.',
    responseTime = '4:32',
    distanceCovered = '0.8 km',
    outcome = 'helped',
    notes = '',
  } = route.params ?? {};

  const isHelped = outcome === 'helped';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleDone = () => {
    navigation.popTo('MainDashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          <View
            style={[styles.iconCircle, !isHelped && styles.iconCircleAmber]}
          >
            {isHelped ? (
              <CheckCircle color="#FFF" size={48} />
            ) : (
              <AlertTriangle color="#FFF" size={48} />
            )}
          </View>
        </Animated.View>

        <Text style={styles.title}>
          {isHelped ? 'Emergency Resolved' : 'Response Logged'}
        </Text>
        <Text style={styles.subtitle}>
          {isHelped
            ? 'Thank you for making a difference'
            : 'Your effort is still appreciated'}
        </Text>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <Text style={styles.cardTitle}>Response Summary</Text>

          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <Clock color={P.muted} size={18} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Response Time</Text>
              <Text style={styles.statValue}>{responseTime}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <MapPin color={P.muted} size={18} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Distance Covered</Text>
              <Text style={styles.statValue}>{distanceCovered}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <User color={P.muted} size={18} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>
                {isHelped ? 'Person Helped' : 'Person Responded To'}
              </Text>
              <Text style={styles.statValue}>{victimName}</Text>
            </View>
          </View>

          {notes.trim().length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <View style={styles.statIcon}>
                  <FileText color={P.muted} size={18} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Notes</Text>
                  <Text style={styles.statValue}>{notes}</Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.impactCard,
            !isHelped && styles.impactCardAmber,
            { opacity: fadeAnim },
          ]}
        >
          <Text
            style={[styles.impactText, !isHelped && styles.impactTextAmber]}
          >
            {isHelped
              ? "Your quick response helped someone in need. You're building a safer community."
              : 'The emergency has been flagged for additional responders. Thank you for trying.'}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.doneButton}
          activeOpacity={0.8}
          onPress={handleDone}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 40,
  },

  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: P.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: P.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircleAmber: {
    backgroundColor: P.amber,
    shadowColor: P.amber,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: P.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: P.textSecondary,
    fontWeight: '500',
    marginBottom: 32,
  },

  card: {
    width: '100%',
    backgroundColor: P.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: P.textPrimary,
    marginBottom: 16,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: P.fieldBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: P.blue,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
    color: P.textPrimary,
  },

  divider: {
    height: 1,
    backgroundColor: P.border,
    marginVertical: 4,
  },

  impactCard: {
    width: '100%',
    backgroundColor: '#E8F6F0',
    borderRadius: 14,
    padding: 16,
  },
  impactCardAmber: {
    backgroundColor: '#FFF7E6',
  },
  impactText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.success,
    textAlign: 'center',
    lineHeight: 20,
  },
  impactTextAmber: {
    color: P.amber,
  },

  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 30,
  },
  doneButton: {
    backgroundColor: P.red,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: P.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
});
