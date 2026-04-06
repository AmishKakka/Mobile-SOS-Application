import BackgroundJob from 'react-native-background-actions';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from './socketService';

const OFFLINE_QUEUE_KEY = '@offline_location_queue';
const LAST_LOCATION_KEY = '@last_known_location'
const CURRENT_USER_ID = 'victim_demo_001'; // Replace with dynamic auth user ID

// ─── PHASE 4: OFFLINE PROTOCOL (The Dead Zone) ──────────────
export async function queueOfflineLocation(location: any) {
  try {
    const existingQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = existingQueue ? JSON.parse(existingQueue) : [];
    queue.push({ ...location, timestamp: Date.now() });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[OFFLINE] Location cached. Queue size: ${queue.length}`);
  } catch (error) {
    console.error('[OFFLINE ERROR] Failed to save location locally', error);
  }
}

export async function flushOfflineQueue() {
  const socket = getSocket();
  if (!socket || !socket.connected) return;

  try {
    const existingQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!existingQueue) return;

    const queue = JSON.parse(existingQueue);
    if (queue.length === 0) return;

    console.log(`[SYNC] Flushing ${queue.length} offline locations to server...`);

    // Send bulk update to backend
    socket.emit('bulk_location_update', { userId: CURRENT_USER_ID, locations: queue });

    // Clear the local queue once sent
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (error) {
    console.error('[SYNC ERROR] Failed to flush offline queue', error);
  }
}

// ─── PHASE 2: PASSIVE STATE (500m + 30-min heartbeat) ──────────────
const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));


const passiveLocationTask = async (taskDataArguments: any) => {
  const { delay } = taskDataArguments;

  await new Promise(async (resolve) => {
    for (let i = 0; BackgroundJob.isRunning(); i++) {
      Geolocation.getCurrentPosition(
        async (position) => {
          const currentLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now(),
          };

          // Get last known location
          const lastLocStr = await AsyncStorage.getItem(LAST_LOCATION_KEY);
          let shouldSend = true;

          if (lastLocStr) {
            const lastLoc = JSON.parse(lastLocStr);
            const distanceMeters = calculateDistance(
              lastLoc.lat, lastLoc.lng,
              currentLoc.lat, currentLoc.lng
            );

            const timeSinceLastMs = currentLoc.timestamp - lastLoc.timestamp;

            // Trigger update if:
            //   • Moved 500 meters OR more, OR
            //   • 30 minutes have passed (safety heartbeat)
            shouldSend = distanceMeters >= 500 || timeSinceLastMs >= 30 * 60 * 1000;
          }

          if (shouldSend) {
            const socket = getSocket();
            if (socket && socket.connected) {
              socket.emit('my_location_updated', {
                userId: CURRENT_USER_ID,
                ...currentLoc,
              });
              console.log(`[PASSIVE] Sent update (moved ${shouldSend ? '≥500m' : 'HEARTBEAT'})`);
            } else {
              queueOfflineLocation(currentLoc);
              console.log(`[PASSIVE] Queued offline update`);
            }

            // Save current location as the new "last known"
            await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(currentLoc));
          } else {
            console.log(`[PASSIVE] Skipped moved < 500m and no heartbeat needed`);
          }
        },
        (error) => console.error('[PASSIVE ERROR]', error),
        {
          enableHighAccuracy: false,   // battery friendly
          timeout: 15000,
          maximumAge: 60000,
        }
      );

      // Wait 5 minutes before next check
      await sleep(delay);
    }
  });
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // returns distance in meters
};

const backgroundOptions = {
  taskName: 'SafeGuardPassiveTracking',
  taskTitle: 'SafeGuard is protecting you',
  taskDesc: 'Running background safety checks',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#ff0000',
  parameters: { delay: 300000 }, // 5 minutes in milliseconds
};

export const startPassiveTracking = async () => {
  if (!BackgroundJob.isRunning()) {
    await BackgroundJob.start(passiveLocationTask, backgroundOptions);
    console.log('[PASSIVE] Background tracking initialized');
  }
};

export const stopPassiveTracking = async () => {
  await BackgroundJob.stop();
};