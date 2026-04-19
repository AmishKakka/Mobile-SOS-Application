import { getApp } from '@react-native-firebase/app';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import { useEffect, useRef } from 'react';

import { getCurrentAppUser, updateCurrentUserStatus } from '../services/appUser';
import { getHelperModeState } from '../services/helperMode';
import { flushOfflineQueue } from '../services/locationTracker';
import { registerSocketUser } from '../services/socketService';
import {
  getCurrentRouteName,
  navigateFromAnywhere,
  navigationRef,
} from '../navigation/navigationRef';

type IncomingSOSPayload = {
  roomId: string;
  victimUserId: string;
  victimName: string;
  victimLocation: { lat: number; lng: number };
  helperDistanceMeters?: number;
  incidentType?: string;
};

function parseNotificationPayload(message: any): IncomingSOSPayload | null {
  const data = message?.data;
  if (!data || data.type !== 'SOS_DISPATCH') {
    return null;
  }

  const roomId = String(data.roomId || '').trim();
  const victimUserId = String(data.victimUserId || '').trim();
  const victimName = String(data.victimName || 'Nearby user').trim();
  const lat = Number(data.victimLat);
  const lng = Number(data.victimLng);
  const helperDistanceMeters =
    data.helperDistanceMeters !== undefined ? Number(data.helperDistanceMeters) : undefined;

  if (!roomId || !victimUserId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    roomId,
    victimUserId,
    victimName: victimName || victimUserId,
    victimLocation: { lat, lng },
    helperDistanceMeters:
      helperDistanceMeters !== undefined && Number.isFinite(helperDistanceMeters)
        ? helperDistanceMeters
        : undefined,
    incidentType: String(data.incidentType || 'Emergency'),
  };
}

export default function HelperDispatchRuntime() {
  const lastOpenedRoomRef = useRef<string | null>(null);
  const lastOpenedAtRef = useRef(0);

  const isHelperDispatchEnabled = async (payload?: IncomingSOSPayload | null) => {
    const helperMode = await getHelperModeState();

    if (!helperMode.isAvailable) {
      return null;
    }

    const session = await getCurrentAppUser();

    if (!session || !helperMode.isAvailable) {
      return null;
    }

    if (payload && session.userId === payload.victimUserId) {
      return null;
    }

    return session;
  };

  useEffect(() => {
    const bootstrap = async () => {
      const session = await isHelperDispatchEnabled();
      if (!session) {
        return;
      }

      try {
        await registerSocketUser(session.userId, 'helper', session.name);
        await updateCurrentUserStatus({ isHelperAvailable: true, role: 'helper' });
        await flushOfflineQueue(session.userId);
      } catch (error) {
        console.warn('[HELPER RUNTIME] Failed to restore helper runtime:', error);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const shouldOpenDispatch = (payload: IncomingSOSPayload) => {
      const currentRoute = navigationRef.getCurrentRoute();
      const currentRoomId =
        currentRoute?.params &&
        typeof currentRoute.params === 'object' &&
        currentRoute.params &&
        'roomId' in currentRoute.params
          ? String((currentRoute.params as Record<string, unknown>).roomId || '')
          : null;

      if (
        currentRoomId &&
        currentRoomId === payload.roomId &&
        ['HelperSOSNotification', 'HelperTracking'].includes(getCurrentRouteName() || '')
      ) {
        return false;
      }

      const now = Date.now();
      if (lastOpenedRoomRef.current === payload.roomId && now - lastOpenedAtRef.current < 5000) {
        return false;
      }

      lastOpenedRoomRef.current = payload.roomId;
      lastOpenedAtRef.current = now;
      return true;
    };

    const openDispatch = (payload: IncomingSOSPayload | null) => {
      if (!payload || !shouldOpenDispatch(payload)) {
        return;
      }

      navigateFromAnywhere('HelperSOSNotification', payload);
    };

    let messaging;
    try {
      const app = getApp();
      messaging = getMessaging(app);
    } catch (error) {
      console.warn('[FCM] Messaging bootstrap unavailable:', error);
      return () => {};
    }

    const unsubscribeForeground = onMessage(messaging, async (message) => {
      const payload = parseNotificationPayload(message);
      const session = await isHelperDispatchEnabled(payload);
      if (!session) {
        return;
      }

      openDispatch(payload);
    });
    const unsubscribeNotificationOpen = onNotificationOpenedApp(messaging, async (message) => {
      const payload = parseNotificationPayload(message);
      const session = await isHelperDispatchEnabled(payload);
      if (!session) {
        return;
      }

      openDispatch(payload);
    });

    getInitialNotification(messaging)
      .then(async (message) => {
        const payload = parseNotificationPayload(message);
        const session = await isHelperDispatchEnabled(payload);
        if (!session) {
          return;
        }

        openDispatch(payload);
      })
      .catch((error) => {
        console.warn('[FCM] Failed to read initial notification:', error);
      });

    return () => {
      unsubscribeForeground();
      unsubscribeNotificationOpen();
    };
  }, []);

  return null;
}
