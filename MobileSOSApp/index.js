/**
 * @format
 */

import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

try {
  const app = getApp();
  const messaging = getMessaging(app);

  setBackgroundMessageHandler(messaging, async (message) => {
    console.log('[FCM] Background message received:', message?.data?.type || 'unknown');
  });
} catch (error) {
  console.warn('[FCM] Background messaging unavailable during app bootstrap:', error);
}

AppRegistry.registerComponent(appName, () => App);
