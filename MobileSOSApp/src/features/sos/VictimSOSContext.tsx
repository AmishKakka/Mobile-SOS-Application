import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Linking } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

import { GOOGLE_MAPS_API_KEY } from '../../config/keys';
import { getCurrentAppUser } from '../../services/appUser';
import { restoreCommunityAvailability } from '../../services/communityAvailability';
import { registerDeviceForPush, subscribeToTokenRefresh } from '../../services/fcmSetup';
import { requestForegroundLocationPermission } from '../../services/permissions';
import { registerSocketUser } from '../../services/socketService';
import { HelperLocation, useSOS } from '../../services/sosService';
import { fetchRoute } from '../../utils/directions';

type DeviceLocation = {
  latitude: number;
  longitude: number;
};

type VictimSession = {
  userId: string;
  name: string;
};

type VictimSOSContextValue = {
  session: VictimSession | null;
  currentLocation: DeviceLocation | null;
  loadingLocation: boolean;
  bootError: string | null;
  isSearching: boolean;
  isEscalated: boolean;
  searchRadius: number;
  timerCount: number;
  helpers: HelperLocation[];
  isConnected: boolean;
  statusMessage: string;
  assignedHelperIds: string[];
  assignedHelpers: HelperLocation[];
  primaryAssignedHelper: HelperLocation | null;
  helperPreview: HelperLocation[];
  timeLabel: string;
  assignedRouteCoords: DeviceLocation[] | null;
  assignedEtaText: string | null;
  triggerSOS: () => Promise<void>;
  cancelSOS: () => void;
  trigger911Call: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const VictimSOSContext = createContext<VictimSOSContextValue | null>(null);

function haversineMeters(a: DeviceLocation, b: DeviceLocation) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function VictimSOSProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<VictimSession | null>(null);
  const [currentLocation, setCurrentLocation] = useState<DeviceLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [assignedRouteCoords, setAssignedRouteCoords] = useState<DeviceLocation[] | null>(null);
  const [assignedEtaText, setAssignedEtaText] = useState<string | null>(null);
  const emergencyDialPromptedRef = useRef(false);
  const unsubscribeTokenRefreshRef = useRef<(() => void) | undefined>(undefined);
  const lastAssignedRouteRef = useRef<{
    victim: DeviceLocation;
    helper: DeviceLocation;
  } | null>(null);

  const {
    isSearching,
    isEscalated,
    searchRadius,
    timerCount,
    helpers,
    isConnected,
    statusMessage,
    assignedHelperIds,
    triggerSOS,
    cancelSOS,
  } = useSOS({
    userId: session?.userId,
    currentLocation,
    onVictimLocationUpdate: setCurrentLocation,
  });

  const trigger911Call = useCallback(async () => {
    try {
      await Linking.openURL('tel:911');
    } catch {
      Alert.alert('Error', 'Could not open the dialer.');
    }
  }, []);

  const bootstrap = async (options?: { silentAuthFailure?: boolean }) => {
    try {
      setBootError(null);
      setLoadingLocation(true);

      const appUser = await getCurrentAppUser();

      setSession({
        userId: appUser.userId,
        name: appUser.name,
      });

      unsubscribeTokenRefreshRef.current?.();
      unsubscribeTokenRefreshRef.current = undefined;

      await registerSocketUser(appUser.userId, 'victim', appUser.name);
      await restoreCommunityAvailability();
      try {
        await registerDeviceForPush(appUser);
        unsubscribeTokenRefreshRef.current = subscribeToTokenRefresh(appUser);
      } catch (pushError) {
        console.warn('[FCM] Push setup skipped on victim app:', pushError);
      }

      const granted = await requestForegroundLocationPermission();
      if (!granted) {
        throw new Error('Location permission was denied.');
      }

      const applyBootLocation = (position: any) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoadingLocation(false);
      };

      const refineLocation = () => {
        Geolocation.getCurrentPosition(
          (position) => {
            applyBootLocation(position);
          },
          (error) => {
            console.warn('[LOCATION] High accuracy refinement failed:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 5000,
            forceLocationManager: true,
            showLocationDialog: true,
          },
        );
      };

      Geolocation.getCurrentPosition(
        (position) => {
          applyBootLocation(position);
          refineLocation();
        },
        () => {
          Geolocation.getCurrentPosition(
            (position) => {
              applyBootLocation(position);
            },
            (error) => {
              setBootError(error.message);
              setLoadingLocation(false);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 5000,
              forceLocationManager: true,
              showLocationDialog: true,
            },
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
          forceLocationManager: true,
          showLocationDialog: true,
        },
      );
    } catch (error: any) {
      const message = error?.message || 'Failed to initialize dashboard.';

      if (
        options?.silentAuthFailure
        && (
          message.includes('Authenticated session is missing an ID token')
          || message.includes('No token, authorization denied')
          || message.includes('Token is not valid')
        )
      ) {
        setSession(null);
        setCurrentLocation(null);
        setBootError(null);
        setLoadingLocation(false);
        return;
      }

      setBootError(message);
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    bootstrap({ silentAuthFailure: true });

    return () => {
      unsubscribeTokenRefreshRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!isEscalated) {
      emergencyDialPromptedRef.current = false;
      return;
    }

    if (emergencyDialPromptedRef.current) {
      return;
    }

    emergencyDialPromptedRef.current = true;
    trigger911Call().catch(() => undefined);
  }, [isEscalated, trigger911Call]);

  const assignedHelpers = useMemo(
    () => helpers.filter((helper) => assignedHelperIds.includes(helper.userId)),
    [assignedHelperIds, helpers],
  );
  const primaryAssignedHelper = useMemo(
    () => assignedHelpers[0] ?? null,
    [assignedHelpers],
  );
  const helperPreview = useMemo(() => helpers.slice(0, 5), [helpers]);
  const timeLabel = useMemo(() => {
    if (!isSearching) {
      return 'Press SOS to request nearby help.';
    }
    return `Active for ${timerCount}s`;
  }, [isSearching, timerCount]);

  useEffect(() => {
    let cancelled = false;

    if (!isSearching || !currentLocation || !primaryAssignedHelper) {
      setAssignedRouteCoords(null);
      setAssignedEtaText(null);
      lastAssignedRouteRef.current = null;
      return;
    }

    const helperLocation = {
      latitude: primaryAssignedHelper.latitude,
      longitude: primaryAssignedHelper.longitude,
    };

    const lastAssignedRoute = lastAssignedRouteRef.current;
    if (lastAssignedRoute) {
      const victimMoved = haversineMeters(lastAssignedRoute.victim, currentLocation);
      const helperMoved = haversineMeters(lastAssignedRoute.helper, helperLocation);
      if (victimMoved < 20 && helperMoved < 20) {
        return;
      }
    }

    (async () => {
      const result = await fetchRoute(currentLocation, helperLocation, GOOGLE_MAPS_API_KEY, 'DRIVE');
      if (cancelled || !result) {
        return;
      }

      setAssignedRouteCoords(result.coordinates);
      setAssignedEtaText(result.durationText);
      lastAssignedRouteRef.current = {
        victim: currentLocation,
        helper: helperLocation,
      };
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLocation, isSearching, primaryAssignedHelper]);

  const value = useMemo<VictimSOSContextValue>(() => ({
    session,
    currentLocation,
    loadingLocation,
    bootError,
    isSearching,
    isEscalated,
    searchRadius,
    timerCount,
    helpers,
    isConnected,
    statusMessage,
    assignedHelperIds,
    assignedHelpers,
    primaryAssignedHelper,
    helperPreview,
    timeLabel,
    assignedRouteCoords,
    assignedEtaText,
    triggerSOS,
    cancelSOS,
    trigger911Call,
    refreshSession: async () => {
      await bootstrap();
    },
  }), [
    session,
    currentLocation,
    loadingLocation,
    bootError,
    isSearching,
    isEscalated,
    searchRadius,
    timerCount,
    helpers,
    isConnected,
    statusMessage,
    assignedHelperIds,
    assignedHelpers,
    primaryAssignedHelper,
    helperPreview,
    timeLabel,
    assignedRouteCoords,
    assignedEtaText,
    triggerSOS,
    cancelSOS,
    trigger911Call,
  ]);

  return (
    <VictimSOSContext.Provider value={value}>
      {children}
    </VictimSOSContext.Provider>
  );
}

export function useVictimSOS() {
  const context = useContext(VictimSOSContext);
  if (!context) {
    throw new Error('useVictimSOS must be used within VictimSOSProvider.');
  }
  return context;
}
