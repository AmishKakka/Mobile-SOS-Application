import { useEffect, useRef, useState } from 'react';
import { getSocket } from './socketService';
import Geolocation from 'react-native-geolocation-service';

export const USER_LOCATION = { latitude: 33.4150, longitude: -111.9085 };
const VICTIM_USER_ID = 'victim_demo_001';
export interface HelperLocation {
  userId: string; name: string; latitude: number; longitude: number; distanceMeters?: number;
}

export interface SOSState {
  isSearching: boolean; searchRadius: number; timerCount: number; helpers: HelperLocation[]; isConnected: boolean;
}

export interface SOSActions {
  triggerSOS: () => void; cancelSOS: () => void;
}

export function useSOS(): SOSState & SOSActions {
  const [isSearching, setIsSearching] = useState(false);
  const [searchRadius, setSearchRadius] = useState(0);
  const [timerCount, setTimerCount] = useState(0);
  const [helpers, setHelpers] = useState<HelperLocation[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const roomId = `incident_${VICTIM_USER_ID}`;

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setIsConnected(true);

    const onHelpersFound = (payload: any) => {
      const mapped = payload.helpers.map((h: any) => ({
        userId: h.userId, name: h.name, latitude: h.lat, longitude: h.long, distanceMeters: h.distance,
      }));
      setHelpers(prev => {
        const existing = new Set(prev.map(h => h.userId));
        return [...prev, ...mapped.filter(h => !existing.has(h.userId))];
      });
    };

    const onHelperMoved = (payload: any) => {
      setHelpers(prev => prev.map(h => h.userId === payload.helperId 
        ? { ...h, latitude: payload.location.lat, longitude: payload.location.lng } : h));
    };

    const onHelperAssigned = (payload: any) => {
      setHelpers(prev => prev.filter(h => h.userId === payload.helperId));
    };

    const onEscalate = () => setSearchRadius(0);
    const onCancelled = () => cancelSOS();

    socket.on(`sos_helpers_${roomId}`, onHelpersFound);
    socket.on('update_helper_pin', onHelperMoved);
    socket.on('helper_assigned', onHelperAssigned);
    socket.on('escalate_to_911', onEscalate);
    socket.on('cancel_alert', onCancelled);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(`sos_helpers_${roomId}`, onHelpersFound);
      socket.off('update_helper_pin', onHelperMoved);
      socket.off('helper_assigned', onHelperAssigned);
      socket.off('escalate_to_911', onEscalate);
      socket.off('cancel_alert', onCancelled);
    };
  }, []);

  useEffect(() => {
    if (!isSearching) return;
    timerRef.current = setInterval(() => {
      setTimerCount(prev => (prev >= 30 ? 30 : prev + 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSearching]);

  const triggerSOS = () => {
    setIsSearching(true);
    setSearchRadius(250);
    setTimerCount(0);
    setHelpers([]);

    const socket = getSocket();
    const initialLoc = { lat: 33.4150, lng: -111.9085 }; // fallback

    // Trigger SOS ONLY ONCE
    socket.emit('sos_trigger', { userId: VICTIM_USER_ID, location: initialLoc });

    // Start high-accuracy live tracking
    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        socket.emit('victim_location_update', { roomId, location: loc });
      },
      (error) => console.error("[ACTIVE GPS ERROR]", error),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 3000 }
    );

    console.log('[SOS] Triggered - Live tracking started');
  };

  const cancelSOS = () => {
    const socket = getSocket();
    socket.emit('sos_cancelled', { roomId });
    setIsSearching(false);
    setSearchRadius(0);
    setHelpers([]);
    setTimerCount(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  return { isSearching, searchRadius, timerCount, helpers, isConnected, triggerSOS, cancelSOS };
}