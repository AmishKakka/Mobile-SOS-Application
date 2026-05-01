import { getApp } from '@react-native-firebase/app';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import { useEffect, useRef } from 'react';

import {
  getCurrentAppUser,
  updateCurrentUserStatus,
} from '../services/appUser';
import { getHelperModeState } from '../services/helperMode';
import { flushOfflineQueue } from '../services/locationTracker';
import { getSocket, registerSocketUser } from '../services/socketService';
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

type ActiveHelperResponsePayload = Partial<IncomingSOSPayload> & {
  active?: boolean;
  helperId?: string;
  activeSeconds?: number;
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
    data.helperDistanceMeters !== undefined
      ? Number(data.helperDistanceMeters)
      : undefined;

  if (
    !roomId ||
    !victimUserId ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return {
    roomId,
    victimUserId,
    victimName: victimName || victimUserId,
    victimLocation: { lat, lng },
    helperDistanceMeters:
      helperDistanceMeters !== undefined &&
      Number.isFinite(helperDistanceMeters)
        ? helperDistanceMeters
        : undefined,
    incidentType: String(data.incidentType || 'Emergency'),
  };
}

export default function HelperDispatchRuntime() {
  const lastOpenedRoomRef = useRef<string | null>(null);
  const lastOpenedAtRef = useRef(0);

  const isHelperDispatchEnabled = async (
    payload?: IncomingSOSPayload | null,
  ) => {
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
    let cleanupSocketListeners: (() => void) | undefined;
    let restoreTimeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const shouldOpenTracking = (roomId: string) => {
      const currentRoute = navigationRef.getCurrentRoute();
      const currentRoomId =
        currentRoute?.params &&
        typeof currentRoute.params === 'object' &&
        'roomId' in currentRoute.params
          ? String(
              (currentRoute.params as Record<string, unknown>).roomId || '',
            )
          : null;

      if (
        currentRoomId === roomId &&
        getCurrentRouteName() === 'HelperTracking'
      ) {
        return false;
      }

      const now = Date.now();
      if (
        lastOpenedRoomRef.current === roomId &&
        now - lastOpenedAtRef.current < 2500
      ) {
        return false;
      }

      lastOpenedRoomRef.current = roomId;
      lastOpenedAtRef.current = now;
      return true;
    };

    const buildTrackingParams = (
      session: { userId: string; name: string },
      payload: ActiveHelperResponsePayload,
    ) => {
      const roomId = String(payload?.roomId || '').trim();
      const victimUserId = String(payload?.victimUserId || '').trim();
      const victimName = String(payload?.victimName || 'Nearby user').trim();
      const latitude = Number(payload?.victimLocation?.lat);
      const longitude = Number(payload?.victimLocation?.lng);

      if (
        !roomId ||
        !victimUserId ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return null;
      }

      return {
        roomId,
        helperId: session.userId,
        helperName: session.name,
        victimName: victimName || victimUserId,
        victimLocation: { latitude, longitude },
        incidentType: String(payload?.incidentType || 'Emergency'),
      };
    };

    const bootstrap = async () => {
      const session = await getCurrentAppUser().catch(() => null);
      if (!session) {
        return;
      }

      try {
        const socket = getSocket();
        const helperMode = await getHelperModeState().catch(() => ({
          isAvailable: false,
        }));
        const openActiveResponse = (
          payload: ActiveHelperResponsePayload | null,
        ) => {
          if (cancelled || !payload?.active) {
            return;
          }

          const params = buildTrackingParams(session, payload);
          if (!params || !shouldOpenTracking(params.roomId)) {
            return;
          }

          navigateFromAnywhere('HelperTracking', params);
        };
        const requestActiveResponseRestore = () => {
          socket.emit(
            'helper_restore_active_response',
            { helperId: session.userId },
            (response: ActiveHelperResponsePayload) => {
              openActiveResponse(response);
            },
          );
        };
        const onRegistered = (payload: any) => {
          if (String(payload?.userId || '') === session.userId) {
            requestActiveResponseRestore();
          }
        };

        socket.on('active_helper_response', openActiveResponse);
        socket.on('registered', onRegistered);
        cleanupSocketListeners = () => {
          socket.off('active_helper_response', openActiveResponse);
          socket.off('registered', onRegistered);
        };

        requestActiveResponseRestore();
        restoreTimeouts = [600, 1500, 3000].map(delay =>
          setTimeout(requestActiveResponseRestore, delay),
        );

        if (helperMode.isAvailable) {
          await registerSocketUser(session.userId, 'helper', session.name);
          await updateCurrentUserStatus({
            isHelperAvailable: true,
            role: 'helper',
          }).catch(error => {
            console.warn(
              '[HELPER RUNTIME] Helper status update skipped:',
              error,
            );
          });
          await flushOfflineQueue(session.userId);
        }
      } catch (error) {
        console.warn(
          '[HELPER RUNTIME] Failed to restore helper runtime:',
          error,
        );
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      cleanupSocketListeners?.();
      restoreTimeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const shouldOpenDispatch = (payload: IncomingSOSPayload) => {
      const currentRoute = navigationRef.getCurrentRoute();
      const currentRoomId =
        currentRoute?.params &&
        typeof currentRoute.params === 'object' &&
        currentRoute.params &&
        'roomId' in currentRoute.params
          ? String(
              (currentRoute.params as Record<string, unknown>).roomId || '',
            )
          : null;

      if (
        currentRoomId &&
        currentRoomId === payload.roomId &&
        ['HelperSOSNotification', 'HelperTracking'].includes(
          getCurrentRouteName() || '',
        )
      ) {
        return false;
      }

      const now = Date.now();
      if (
        lastOpenedRoomRef.current === payload.roomId &&
        now - lastOpenedAtRef.current < 5000
      ) {
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

    const unsubscribeForeground = onMessage(messaging, async message => {
      const payload = parseNotificationPayload(message);
      const session = await isHelperDispatchEnabled(payload);
      if (!session) {
        return;
      }

      openDispatch(payload);
    });
    const unsubscribeNotificationOpen = onNotificationOpenedApp(
      messaging,
      async message => {
        const payload = parseNotificationPayload(message);
        const session = await isHelperDispatchEnabled(payload);
        if (!session) {
          return;
        }

        openDispatch(payload);
      },
    );

    getInitialNotification(messaging)
      .then(async message => {
        const payload = parseNotificationPayload(message);
        const session = await isHelperDispatchEnabled(payload);
        if (!session) {
          return;
        }

        openDispatch(payload);
      })
      .catch(error => {
        console.warn('[FCM] Failed to read initial notification:', error);
      });

    return () => {
      unsubscribeForeground();
      unsubscribeNotificationOpen();
    };
  }, []);

  return null;
}
