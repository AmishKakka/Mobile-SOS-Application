import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { API_BASE_URL } from '../config/keys';
import type { DemoSession } from './demoSession';

async function upsertDeviceToken(userId: string, token: string | null) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/device`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fcmToken: token,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to save FCM token: ${response.status} ${text}`);
  }
}

export async function registerDeviceForPush(session: DemoSession) {
  const app = getApp();
  const messaging = getMessaging(app);

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Allow emergency notifications',
        message:
          'SafeGuard needs notification permission so helpers can receive SOS dispatch alerts.',
        buttonPositive: 'Allow',
      },
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Notification permission was denied.');
    }
  }

  await requestPermission(messaging);

  const token = await getToken(messaging);
  await upsertDeviceToken(session.userId, token);
  console.log('[FCM] Device token registered for user:', session.userId);
  return token;
}

export function subscribeToTokenRefresh(session: DemoSession) {
  const app = getApp();
  const messaging = getMessaging(app);

  return onTokenRefresh(messaging, async (token) => {
    try {
      await upsertDeviceToken(session.userId, token);
      console.log('[FCM] Refreshed token saved for user:', session.userId);
    } catch (error) {
      console.error('[FCM] Failed to save refreshed token:', error);
    }
  });
}
