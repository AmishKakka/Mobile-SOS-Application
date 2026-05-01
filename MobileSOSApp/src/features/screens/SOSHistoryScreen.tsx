import { useFocusEffect } from '@react-navigation/native';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  HelpCircle,
  MapPin,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../../config/config';
import { getCurrentIdToken } from '../../services/appUser';

type NavigationLike = {
  goBack: () => void;
};

type Props = {
  navigation: NavigationLike;
};

type HistoryRole = 'victim' | 'helper';
type VictimStatus = 'active' | 'resolved' | 'cancelled';
type HelperStatus =
  | 'active'
  | 'resolved'
  | 'cancelled'
  | 'helped'
  | 'could_not_handle';
type HistoryLocation = { lat: number; lng: number } | null;
type LocationLabels = Record<string, string>;

type VictimHistoryEvent = {
  id: string;
  incidentId: string;
  role: 'victim';
  status: VictimStatus;
  title: string;
  sosPressedAt: string;
  sosPressedLocation: HistoryLocation;
  helpersCount: number;
  resolvedAt?: string | null;
  resolvedLocation?: HistoryLocation;
  completionDurationSeconds?: number | null;
};

type HelperHistoryEvent = {
  id: string;
  incidentId: string;
  role: 'helper';
  status: HelperStatus;
  title: string;
  victimName: string;
  requestReceivedAt?: string | null;
  acceptedAt?: string | null;
  arrivedAt?: string | null;
  arrivalDurationSeconds?: number | null;
  resolvedAt?: string | null;
  resolvedLocation?: HistoryLocation;
  couldNotHandleAt?: string | null;
  initialDistanceMeters?: number | null;
  occurredAt?: string;
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

const addressCache = new Map<string, string>();

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return 'Recently';
  }

  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return 'Not recorded';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number | null) {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) {
    return 'Not recorded';
  }

  const safeSeconds = Math.max(0, Math.round(seconds));
  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }

  const totalMinutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (totalMinutes < 60) {
    return remainingSeconds > 0
      ? `${totalMinutes} min ${remainingSeconds}s`
      : `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function formatDistance(meters?: number | null) {
  if (meters === undefined || meters === null || !Number.isFinite(meters)) {
    return null;
  }

  return meters < 1000
    ? `${Math.round(meters)}m away`
    : `${(meters / 1000).toFixed(1)}km away`;
}

function formatCoordinates(location: HistoryLocation) {
  if (!location) {
    return 'Not recorded';
  }

  return `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(
    5,
  )}`;
}

function getCoordinateKey(location: HistoryLocation) {
  if (!location) {
    return '';
  }

  return `${Number(location.lat).toFixed(5)},${Number(location.lng).toFixed(
    5,
  )}`;
}

async function reverseGeocodeLocation(location: HistoryLocation) {
  if (!location || !GOOGLE_MAPS_API_KEY) {
    return formatCoordinates(location);
  }

  const coordinateKey = getCoordinateKey(location);
  const cached = addressCache.get(coordinateKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }

    const payload = await response.json();
    const formattedAddress = payload?.results?.[0]?.formatted_address;
    const label =
      typeof formattedAddress === 'string' && formattedAddress.trim()
        ? formattedAddress.trim()
        : formatCoordinates(location);

    addressCache.set(coordinateKey, label);
    return label;
  } catch {
    const fallback = formatCoordinates(location);
    addressCache.set(coordinateKey, fallback);
    return fallback;
  }
}

function getLocationText(
  location: HistoryLocation,
  labelKey: string,
  labels: LocationLabels,
) {
  if (!location) {
    return 'Not recorded';
  }

  if (labels[labelKey]) {
    return labels[labelKey];
  }

  return GOOGLE_MAPS_API_KEY
    ? 'Resolving address...'
    : formatCoordinates(location);
}

function getVictimStatusConfig(status: VictimStatus) {
  if (status === 'resolved') {
    return {
      label: 'RESOLVED',
      color: P.success,
      bg: '#E8F6F0',
      Icon: CheckCircle,
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'CANCELLED',
      color: P.red,
      bg: '#FCE8EA',
      Icon: XCircle,
    };
  }

  return {
    label: 'ACTIVE',
    color: P.blue,
    bg: '#E9F3F8',
    Icon: AlertTriangle,
  };
}

function getHelperStatusConfig(status: HelperStatus) {
  if (status === 'could_not_handle') {
    return {
      label: 'COULD NOT HANDLE',
      color: P.amber,
      bg: '#FFF7E6',
      Icon: XCircle,
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'CANCELLED',
      color: P.red,
      bg: '#FCE8EA',
      Icon: XCircle,
    };
  }

  if (status === 'active') {
    return {
      label: 'ACTIVE',
      color: P.blue,
      bg: '#E9F3F8',
      Icon: AlertTriangle,
    };
  }

  return {
    label: 'HELPED',
    color: P.success,
    bg: '#E8F6F0',
    Icon: CheckCircle,
  };
}

function DetailRow({
  Icon,
  label,
  value,
}: {
  Icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Icon color={P.muted} size={15} strokeWidth={2.2} />
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function VictimCard({
  event,
  locationLabels,
}: {
  event: VictimHistoryEvent;
  locationLabels: LocationLabels;
}) {
  const config = getVictimStatusConfig(event.status);
  const Icon = config.Icon;
  const pressedLocationKey = `${event.id}:pressed`;
  const resolvedLocationKey = `${event.id}:resolved`;

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: config.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.typeRow}>
            <View style={[styles.eventIcon, { backgroundColor: config.bg }]}>
              <Icon color={config.color} size={16} strokeWidth={2.4} />
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.eventType} numberOfLines={1}>
                {event.title || 'SOS request'}
              </Text>
              <Text style={styles.subtitleLine} numberOfLines={1}>
                Pressed {formatRelativeTime(event.sosPressedAt)}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <DetailRow
            Icon={Clock}
            label="SOS pressed"
            value={formatDateTime(event.sosPressedAt)}
          />
          <DetailRow
            Icon={MapPin}
            label="Pressed location"
            value={getLocationText(
              event.sosPressedLocation,
              pressedLocationKey,
              locationLabels,
            )}
          />
          <DetailRow
            Icon={Users}
            label="Helpers"
            value={`${event.helpersCount || 0} helper${
              event.helpersCount === 1 ? '' : 's'
            }`}
          />
          <DetailRow
            Icon={Clock}
            label="SOS resolved"
            value={
              event.resolvedAt
                ? formatDateTime(event.resolvedAt)
                : 'Still active'
            }
          />
          <DetailRow
            Icon={MapPin}
            label="Resolved location"
            value={
              event.resolvedAt
                ? getLocationText(
                    event.resolvedLocation || null,
                    resolvedLocationKey,
                    locationLabels,
                  )
                : 'Waiting for resolution'
            }
          />
          <DetailRow
            Icon={CheckCircle}
            label="Total time"
            value={
              event.completionDurationSeconds === null ||
              event.completionDurationSeconds === undefined
                ? event.resolvedAt
                  ? 'Not recorded'
                  : 'In progress'
                : formatDuration(event.completionDurationSeconds)
            }
          />
        </View>
      </View>
    </View>
  );
}

function HelperCard({
  event,
  locationLabels,
}: {
  event: HelperHistoryEvent;
  locationLabels: LocationLabels;
}) {
  const config = getHelperStatusConfig(event.status);
  const Icon = config.Icon;
  const resolvedLocationKey = `${event.id}:resolved`;
  const distance = formatDistance(event.initialDistanceMeters);

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: config.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.typeRow}>
            <View style={[styles.eventIcon, { backgroundColor: config.bg }]}>
              <Icon color={config.color} size={16} strokeWidth={2.4} />
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.eventType} numberOfLines={1}>
                {event.title || 'Helper response'}
              </Text>
              <Text style={styles.subtitleLine} numberOfLines={1}>
                {distance
                  ? `Request was ${distance}`
                  : `For ${event.victimName || 'the victim'}`}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <DetailRow
            Icon={Clock}
            label="Request received"
            value={formatDateTime(event.requestReceivedAt)}
          />
          <DetailRow
            Icon={CheckCircle}
            label="Accepted"
            value={formatDateTime(event.acceptedAt)}
          />
          <DetailRow
            Icon={MapPin}
            label="Arrival time"
            value={
              event.arrivalDurationSeconds === null ||
              event.arrivalDurationSeconds === undefined
                ? event.arrivedAt
                  ? formatDateTime(event.arrivedAt)
                  : 'Not recorded'
                : formatDuration(event.arrivalDurationSeconds)
            }
          />
          <DetailRow
            Icon={Clock}
            label="SOS resolved"
            value={
              event.resolvedAt
                ? formatDateTime(event.resolvedAt)
                : event.couldNotHandleAt
                ? 'Not resolved before you stopped'
                : 'Still active'
            }
          />
          <DetailRow
            Icon={MapPin}
            label="Resolved location"
            value={
              event.resolvedAt
                ? getLocationText(
                    event.resolvedLocation || null,
                    resolvedLocationKey,
                    locationLabels,
                  )
                : 'Waiting for resolution'
            }
          />
        </View>
      </View>
    </View>
  );
}

function collectLocationPoints(
  victimEvents: VictimHistoryEvent[],
  helperEvents: HelperHistoryEvent[],
) {
  const points: { key: string; location: HistoryLocation }[] = [];

  victimEvents.forEach(event => {
    points.push({
      key: `${event.id}:pressed`,
      location: event.sosPressedLocation,
    });
    if (event.resolvedAt) {
      points.push({
        key: `${event.id}:resolved`,
        location: event.resolvedLocation || null,
      });
    }
  });

  helperEvents.forEach(event => {
    if (event.resolvedAt) {
      points.push({
        key: `${event.id}:resolved`,
        location: event.resolvedLocation || null,
      });
    }
  });

  return points.filter(point => point.location);
}

export default function SOSHistoryScreen({ navigation }: Props) {
  const [selectedRole, setSelectedRole] = useState<HistoryRole>('victim');
  const [victimEvents, setVictimEvents] = useState<VictimHistoryEvent[]>([]);
  const [helperEvents, setHelperEvents] = useState<HelperHistoryEvent[]>([]);
  const [locationLabels, setLocationLabels] = useState<LocationLabels>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resolveLocationLabels = useCallback(
    async (
      nextVictimEvents: VictimHistoryEvent[],
      nextHelperEvents: HelperHistoryEvent[],
    ) => {
      const points = collectLocationPoints(nextVictimEvents, nextHelperEvents);
      const nextLabels: LocationLabels = {};

      await Promise.all(
        points.map(async point => {
          nextLabels[point.key] = await reverseGeocodeLocation(point.location);
        }),
      );

      setLocationLabels(nextLabels);
    },
    [],
  );

  const loadHistory = useCallback(
    async (refreshing = false) => {
      try {
        setErrorMessage('');
        if (refreshing) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const token = await getCurrentIdToken();
        if (!token) {
          throw new Error('Your session expired. Please sign in again.');
        }

        const response = await fetch(`${API_BASE_URL}/users/sos-history`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Failed to load SOS history.');
        }

        const payload = await response.json();
        const nextVictimEvents = Array.isArray(payload.victimEvents)
          ? payload.victimEvents
          : [];
        const nextHelperEvents = Array.isArray(payload.helperEvents)
          ? payload.helperEvents
          : [];

        setVictimEvents(nextVictimEvents);
        setHelperEvents(nextHelperEvents);
        setLocationLabels({});
        resolveLocationLabels(nextVictimEvents, nextHelperEvents).catch(() => {
          setLocationLabels({});
        });
      } catch (error: any) {
        setErrorMessage(error?.message || 'Failed to load SOS history.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [resolveLocationLabels],
  );

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const visibleEvents = selectedRole === 'victim' ? victimEvents : helperEvents;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft color={P.textPrimary} size={30} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.stepText}>SOS ACTIVITY</Text>
        <Text style={styles.title}>SOS History</Text>
        <Text style={styles.subtitle}>
          Review incidents separately as the person requesting help or as a
          helper responding to someone nearby.
        </Text>

        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedRole === 'victim' && styles.segmentButtonActive,
            ]}
            activeOpacity={0.82}
            onPress={() => setSelectedRole('victim')}
          >
            <Text
              style={[
                styles.segmentText,
                selectedRole === 'victim' && styles.segmentTextActive,
              ]}
            >
              As Victim ({victimEvents.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedRole === 'helper' && styles.segmentButtonActive,
            ]}
            activeOpacity={0.82}
            onPress={() => setSelectedRole('helper')}
          >
            <Text
              style={[
                styles.segmentText,
                selectedRole === 'helper' && styles.segmentTextActive,
              ]}
            >
              As Helper ({helperEvents.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={visibleEvents}
        keyExtractor={event => event.id}
        renderItem={({ item }) =>
          selectedRole === 'victim' ? (
            <VictimCard
              event={item as VictimHistoryEvent}
              locationLabels={locationLabels}
            />
          ) : (
            <HelperCard
              event={item as HelperHistoryEvent}
              locationLabels={locationLabels}
            />
          )
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadHistory(true)}
            tintColor={P.red}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <>
                <ActivityIndicator size="large" color={P.red} />
                <Text style={styles.emptyTitle}>Loading history</Text>
              </>
            ) : errorMessage ? (
              <>
                <HelpCircle color={P.red} size={48} strokeWidth={2.2} />
                <Text style={styles.emptyTitle}>Could not load history</Text>
                <Text style={styles.emptyDesc}>{errorMessage}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  activeOpacity={0.8}
                  onPress={() => loadHistory()}
                >
                  <RefreshCw color="#FFFFFF" size={17} strokeWidth={2.4} />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <CheckCircle color={P.success} size={48} strokeWidth={2.2} />
                <Text style={styles.emptyTitle}>
                  No {selectedRole === 'victim' ? 'victim' : 'helper'} history
                  yet
                </Text>
                <Text style={styles.emptyDesc}>
                  {selectedRole === 'victim'
                    ? 'SOS requests you create will appear here.'
                    : 'Requests you accept as a helper will appear here.'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
  },
  backButton: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18 },
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
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: P.fieldBg,
    borderRadius: 16,
    padding: 4,
    marginTop: 18,
    borderWidth: 1,
    borderColor: P.border,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    backgroundColor: P.card,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  segmentText: {
    color: P.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: { color: P.textPrimary },
  list: { paddingHorizontal: 24, paddingBottom: 34, flexGrow: 1 },
  card: {
    backgroundColor: P.card,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 15 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    minWidth: 0,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: { flex: 1, minWidth: 0 },
  eventType: { fontSize: 15, fontWeight: '900', color: P.textPrimary },
  subtitleLine: {
    color: P.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    maxWidth: 132,
  },
  statusText: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  detailsGrid: {
    gap: 10,
    paddingTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailTextWrap: { flex: 1, minWidth: 0 },
  detailLabel: {
    color: P.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 1,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: P.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 70,
    paddingHorizontal: 12,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: P.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: P.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.red,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 4,
  },
  retryButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
