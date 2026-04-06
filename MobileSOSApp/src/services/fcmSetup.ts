import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

export async function requestUserPermissionAndGetToken() {
  try {
    // 1. Request permission (Shows the iOS/Android popup asking to send notifications)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('[FCM] Push notifications authorized!');
      
      // 2. Fetch the physical device token from Google/Apple servers
      const token = await messaging().getToken();
      
      console.log('====================================');
      console.log('🔥 YOUR REAL FCM TOKEN:');
      console.log(token);
      console.log('====================================');

      return token;
    } else {
      console.log('[FCM] User declined push permissions.');
    }
  } catch (error) {
    console.error('[FCM ERROR] Failed to get token:', error);
  }
}