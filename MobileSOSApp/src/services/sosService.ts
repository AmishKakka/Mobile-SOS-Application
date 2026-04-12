import { useEffect, useRef, useState } from 'react';
import { getSocket } from './socketService';

export const USER_LOCATION = { latitude: 33.4150, longitude: -111.9085 };
const VICTIM_USER_ID = 'victim_demo_001';

export interface HelperLocation {
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
}

export interface SOSState {
  isSearching: boolean;
  searchRadius: number;
  timerCount: number;
  helpers: HelperLocation[];
  isConnected: boolean;
}

export interface SOSActions {
  triggerSOS: () => void;
  cancelSOS: () => void;
}

export function useSOS(): SOSState & SOSActions {
  const [isSearching, setIsSearching]   = useState(false);
  const [searchRadius, setSearchRadius] = useState(0);
  const [timerCount, setTimerCount]     = useState(0);
  const [helpers, setHelpers]           = useState<HelperLocation[]>([]);
  const [isConnected, setIsConnected]   = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomId   = `incident_${VICTIM_USER_ID}`;

  // Socket connection & event listeners
  useEffect(() => {
    const socket = getSocket();

    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setIsConnected(true);

    // Backend found nearby helpers — add them to the map
    const onHelpersFound = (payload: {
      helpers: Array<{ userId: string; name: string; lat: number; long: number; distance: number }>;
    }) => {
      console.log('[SOS] Helpers found:', payload.helpers.length);
      const mapped: HelperLocation[] = payload.helpers.map((h) => ({
        userId:         h.userId,
        name:           h.name,
        latitude:       h.lat,
        longitude:      h.long,
        distanceMeters: h.distance,
      }));
      setHelpers((prev) => {
        const existingIds = new Set(prev.map((h) => h.userId));
        const newOnes = mapped.filter((h) => !existingIds.has(h.userId));
        return [...prev, ...newOnes];
      });
    };

    // A helper moved — update their pin on the map
    const onHelperMoved = (payload: {
      helperId: string;
      location: { lat: number; lng: number };
    }) => {
      setHelpers((prev) =>
        prev.map((h) =>
          h.userId === payload.helperId
            ? { ...h, latitude: payload.location.lat, longitude: payload.location.lng }
            : h,
        ),
      );
    };

    // One specific helper accepted — remove all others from the map
    const onHelperAssigned = (payload: { helperId: string; helperName: string }) => {
      console.log('[SOS] Helper confirmed:', payload.helperName);
      setHelpers((prev) => prev.filter((h) => h.userId === payload.helperId));
    };

    // Radius expanded server-side
    const onSearchExpanded = (payload: { radius: number }) => {
      setSearchRadius(payload.radius);
    };

    // No helpers found anywhere — 911 escalation
    const onEscalate = () => {
      console.warn('[SOS] No helpers found — escalating to 911');
      setSearchRadius(0);
    };

    const onCancelled = () => { cancelSOS(); };

    socket.on(`sos_helpers_${roomId}`, onHelpersFound);
    socket.on('update_helper_pin',     onHelperMoved);
    socket.on('helper_assigned',       onHelperAssigned);
    socket.on('search_expanded',       onSearchExpanded);
    socket.on('escalate_to_911',       onEscalate);
    socket.on('cancel_alert',          onCancelled);

    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(`sos_helpers_${roomId}`, onHelpersFound);
      socket.off('update_helper_pin',     onHelperMoved);
      socket.off('helper_assigned',       onHelperAssigned);
      socket.off('search_expanded',       onSearchExpanded);
      socket.off('escalate_to_911',       onEscalate);
      socket.off('cancel_alert',          onCancelled);
    };
  }, []);

  // Countdown timer for UI display only
  useEffect(() => {
    if (!isSearching) return;
    timerRef.current = setInterval(() => {
      setTimerCount((prev) => {
        if (prev >= 30) { clearInterval(timerRef.current!); return 30; }
        return prev + 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSearching]);

  const triggerSOS = () => {
    const socket = getSocket();
    setHelpers([]);
    setTimerCount(0);
    setSearchRadius(250);
    setIsSearching(true);
    socket.emit('sos_trigger', {
      userId:   VICTIM_USER_ID,
      location: { lat: USER_LOCATION.latitude, lng: USER_LOCATION.longitude },
    });
    console.log('[SOS] Triggered');
  };

  const cancelSOS = () => {
    const socket = getSocket();
    socket.emit('sos_cancelled', { roomId });
    setIsSearching(false);
    setSearchRadius(0);
    setHelpers([]);
    setTimerCount(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return { isSearching, searchRadius, timerCount, helpers, isConnected, triggerSOS, cancelSOS };
}