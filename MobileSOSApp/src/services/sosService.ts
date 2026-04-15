import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { getSocket } from './socketService';

export interface HelperLocation {
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
}

export interface MapLocation {
  latitude: number;
  longitude: number;
}

export interface SOSState {
  isSearching: boolean;
  isEscalated: boolean;
  searchRadius: number;
  timerCount: number;
  helpers: HelperLocation[];
  isConnected: boolean;
  statusMessage: string;
  assignedHelperIds: string[];
}

export interface SOSActions {
  triggerSOS: () => Promise<void>;
  cancelSOS: () => void;
}

export function useSOS({
  userId,
  currentLocation,
  onVictimLocationUpdate,
}: {
  userId?: string;
  currentLocation: MapLocation | null;
  onVictimLocationUpdate?: (location: MapLocation) => void;
}): SOSState & SOSActions {
  const [isSearching, setIsSearching] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [searchRadius, setSearchRadius] = useState(0);
  const [timerCount, setTimerCount] = useState(0);
  const [helpers, setHelpers] = useState<HelperLocation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [assignedHelperIds, setAssignedHelperIds] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const roomId = useMemo(() => (userId ? `incident_${userId}` : null), [userId]);

  const stopLocalTracking = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const resetSOSState = useCallback(() => {
    stopLocalTracking();
    setIsSearching(false);
    setIsEscalated(false);
    setSearchRadius(0);
    setTimerCount(0);
    setHelpers([]);
    setAssignedHelperIds([]);
    setStatusMessage('Ready');
  }, [stopLocalTracking]);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const socket = getSocket();

    const onHelpersFound = (payload: any) => {
      if (payload.roomId !== roomId) {
        return;
      }

      const mapped: HelperLocation[] = (payload.helpers || []).map((helper: any) => ({
        userId: helper.userId,
        name: helper.name || helper.userId,
        latitude: helper.lat,
        longitude: helper.long,
        distanceMeters: helper.distance,
      }));

      setHelpers(mapped);
      setStatusMessage(
        mapped.length
          ? `${mapped.length} helper${mapped.length > 1 ? 's' : ''} found nearby.`
          : 'Searching nearby helpers...',
      );
    };

    const onSearchProgress = (payload: any) => {
      if (payload.roomId !== roomId) {
        return;
      }

      const radiusMeters = Number(payload.radiusMeters);
      if (Number.isFinite(radiusMeters) && radiusMeters > 0) {
        setSearchRadius(radiusMeters);
        setStatusMessage((previous) => {
          if (
            previous.includes('found nearby') ||
            previous.includes('on the way') ||
            previous.includes('Escalate')
          ) {
            return previous;
          }

          return `Searching within ${Math.round(radiusMeters)}m...`;
        });
      }
    };

    const onHelperMoved = (payload: any) => {
      setHelpers((previous) =>
        previous.map((helper) =>
          helper.userId === payload.helperId
            ? {
              ...helper,
              latitude: payload.location.lat,
              longitude: payload.location.lng,
            }
            : helper,
        ),
      );
    };

    const onHelperAssigned = (payload: any) => {
      if (payload.roomId !== roomId) {
        return;
      }

      setAssignedHelperIds((previous) => {
        if (Array.isArray(payload.acceptedHelperIds) && payload.acceptedHelperIds.length > 0) {
          return payload.acceptedHelperIds.map((id: any) => String(id));
        }

        const nextId = String(payload.helperId || '');
        if (!nextId || previous.includes(nextId)) {
          return previous;
        }
        return [...previous, nextId];
      });
      setStatusMessage(payload.message || 'A helper is on the way.');
    };

    const onEscalate = (payload: any) => {
      if (payload.roomId !== roomId) {
        return;
      }
      setStatusMessage(payload.message || 'No helpers available. Escalate immediately.');
      setIsEscalated(true);
    };

    const onCancelled = (payload: any) => {
      if (payload.roomId !== roomId) {
        return;
      }
      resetSOSState();
    };

    const onResolved = (payload: any) => {
      if (payload.roomId !== roomId) {
        return;
      }
      setStatusMessage('Emergency marked as resolved.');
      resetSOSState();
    };

    const onHelperCancelled = (payload: any) => {
      if (payload.roomId !== roomId) {
        return;
      }
      setAssignedHelperIds((previous) => {
        if (Array.isArray(payload.acceptedHelperIds)) {
          return payload.acceptedHelperIds.map((id: any) => String(id));
        }

        const cancelledHelperId = String(payload.helperId || '');
        return previous.filter((helperId) => helperId !== cancelledHelperId);
      });
      setStatusMessage(payload.reason || 'Assigned helper stopped responding.');
    };

    socket.on(`sos_helpers_${roomId}`, onHelpersFound);
    socket.on('dispatch_search_progress', onSearchProgress);
    socket.on('update_helper_pin', onHelperMoved);
    socket.on('helper_assigned', onHelperAssigned);
    socket.on('escalate_to_911', onEscalate);
    socket.on('cancel_alert', onCancelled);
    socket.on('incident_resolved', onResolved);
    socket.on('helper_response_cancelled', onHelperCancelled);

    return () => {
      socket.off(`sos_helpers_${roomId}`, onHelpersFound);
      socket.off('dispatch_search_progress', onSearchProgress);
      socket.off('update_helper_pin', onHelperMoved);
      socket.off('helper_assigned', onHelperAssigned);
      socket.off('escalate_to_911', onEscalate);
      socket.off('cancel_alert', onCancelled);
      socket.off('incident_resolved', onResolved);
      socket.off('helper_response_cancelled', onHelperCancelled);
    };
  }, [resetSOSState, roomId]);

  useEffect(() => {
    if (!isSearching) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimerCount((previous) => previous + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSearching]);

  const triggerSOS = useCallback(async () => {
    if (!userId || !roomId || !currentLocation) {
      setStatusMessage('Current location is not ready yet.');
      return;
    }

    const socket = getSocket();
    const initialLocation = {
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
    };

    setIsSearching(true);
    setIsEscalated(false);
    setTimerCount(0);
    setHelpers([]);
    setSearchRadius(250);
    setAssignedHelperIds([]);
    setStatusMessage('Searching nearby helpers...');

    socket.emit('sos_trigger', { userId, location: initialLocation });

    try {
      Geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          onVictimLocationUpdate?.(nextLocation);
          socket.emit('victim_location_update', {
            roomId,
            location: { lat: nextLocation.latitude, lng: nextLocation.longitude },
          });
        },
        (error) => {
          console.error('[SOS] Failed to refresh victim location:', error);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 10000,
          forceLocationManager: true,
          showLocationDialog: true,
        },
      );

      watchIdRef.current = Geolocation.watchPosition(
        (position) => {
          const nextLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          onVictimLocationUpdate?.(nextLocation);
          socket.emit('victim_location_update', {
            roomId,
            location: { lat: nextLocation.latitude, lng: nextLocation.longitude },
          });
        },
        (error) => console.error('[SOS] Failed to stream victim location:', error),
        {
          enableHighAccuracy: false,
          distanceFilter: 25,
          interval: 5000,
          fastestInterval: 3000,
          forceLocationManager: true,
          showLocationDialog: true,
        }
      );
    } catch (error) {
      console.error('[SOS] watchPosition threw during SOS start:', error);
      setStatusMessage('SOS active. Live location updates are temporarily unavailable.');
    }
  }, [currentLocation, onVictimLocationUpdate, roomId, userId]);

  const cancelSOS = useCallback(() => {
    if (!roomId) {
      resetSOSState();
      return;
    }

    const socket = getSocket();
    socket.emit('sos_cancelled', { roomId });
    resetSOSState();
  }, [resetSOSState, roomId]);

  useEffect(() => {
    return () => {
      stopLocalTracking();
    };
  }, [stopLocalTracking]);

  return {
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
  };
}
