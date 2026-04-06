import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export async function requestLocationPermission() {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'SafeGuard Location Permission',
          message: 'SafeGuard needs access to your GPS to route helpers to you in an emergency.',
          buttonPositive: 'Allow',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ [LOCATION] Permission granted by user');
        return true;
      } else {
        console.warn('❌ [LOCATION] Permission denied by user');
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  } else if (Platform.OS === 'ios') {
    // iOS handles the popup automatically when you call requestAuthorization
    const auth = await Geolocation.requestAuthorization('whenInUse');
    console.log(`[LOCATION] iOS Auth status: ${auth}`);
    return auth === 'granted';
  }
}
