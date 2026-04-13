import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export async function requestForegroundLocationPermission() {
  if (Platform.OS === 'android') {
    try {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      const coarseGranted =
        result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const fineGranted =
        result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return coarseGranted || fineGranted;
    } catch (error) {
      console.warn('[Permissions] Android foreground location request failed:', error);
      return false;
    }
  }

  const auth = await Geolocation.requestAuthorization('whenInUse');
  return auth === 'granted';
}

export async function requestBackgroundLocationPermission() {
  if (Platform.OS !== 'android') {
    const auth = await Geolocation.requestAuthorization('always');
    return auth === 'granted';
  }

  if (Platform.Version < 29) {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Allow background location',
        message:
          'SafeGuard uses background location to keep helpers discoverable during emergencies.',
        buttonPositive: 'Allow',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn('[Permissions] Android background location request failed:', error);
    return false;
  }
}

export async function requestLocationPermissionsForTracking() {
  const foregroundGranted = await requestForegroundLocationPermission();
  if (!foregroundGranted) {
    return false;
  }

  const backgroundGranted = await requestBackgroundLocationPermission();
  return backgroundGranted;
}