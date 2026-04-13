import BackgroundJob from 'react-native-background-actions';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from './socketService';

const OFFLINE_QUEUE_PREFIX = '@offline_location_queue:';
const LAST_LOCATION_PREFIX = '@last_known_location:';

function getQueueKey(userId: string) { return `${OFFLINE_QUEUE_PREFIX}${userId}`; }
function getLastLocKey(userId: string) { return `${LAST_LOCATION_PREFIX}${userId}`; }

export async function queueOfflineLocation(userId: string, location: any) {
  try {
    const key = getQueueKey(userId);
    const queue = JSON.parse((await AsyncStorage.getItem(key)) || '[]');
    queue.push({ ...location, timestamp: Date.now() });
    await AsyncStorage.setItem(key, JSON.stringify(queue));
  } catch (e) { console.error('[OFFLINE]', e); }
}

export async function flushOfflineQueue(userId: string) {
  const socket = getSocket();
  if (!socket.connected) return;

  const key = getQueueKey(userId);
  const queueStr = await AsyncStorage.getItem(key);
  if (!queueStr) return;

  const queue = JSON.parse(queueStr);
  if (!Array.isArray(queue) || queue.length === 0) return;

  socket.emit('bulk_location_update', { userId, locations: queue });
  await AsyncStorage.removeItem(key);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const passiveLocationTask = async (taskData: { delay: number; userId: string }) => {
  const { delay, userId } = taskData;

  while (BackgroundJob.isRunning()) {
    Geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() };

        const lastStr = await AsyncStorage.getItem(getLastLocKey(userId));
        let shouldSend = true;

        if (lastStr) {
          const last = JSON.parse(lastStr);
          const dist = calculateDistance(last.lat, last.lng, loc.lat, loc.lng);
          const timePassed = loc.timestamp - last.timestamp;
          shouldSend = dist >= 500 || timePassed >= 30 * 60 * 1000;
        }

        if (shouldSend) {
          const socket = getSocket();
          if (socket.connected) {
            socket.emit('my_location_updated', { userId, ...loc });
          } else {
            await queueOfflineLocation(userId, loc);
          }
          await AsyncStorage.setItem(getLastLocKey(userId), JSON.stringify(loc));
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );

    await sleep(delay);
  }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function sendImmediateLocation(userId: string) {
  return new Promise<{ lat: number; lng: number; timestamp: number }>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      async (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: Date.now(),
        };

        try {
          const socket = getSocket();
          if (socket.connected) {
            socket.emit('my_location_updated', { userId, ...loc });
          } else {
            await queueOfflineLocation(userId, loc);
          }

          await AsyncStorage.setItem(getLastLocKey(userId), JSON.stringify(loc));
          resolve(loc);
        } catch (error) {
          reject(error);
        }
      },
      reject,
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  });
}

export const startPassiveTracking = async (userId: string) => {
  if (BackgroundJob.isRunning()) return;
  await BackgroundJob.start(passiveLocationTask, {
    taskName: 'SafeGuardPassiveTracking',
    taskTitle: 'SafeGuard is protecting you',
    taskDesc: 'Running background safety checks',
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#ff0000',
    parameters: { delay: 300000, userId },
  });
};

export const stopPassiveTracking = async () => {
  if (BackgroundJob.isRunning()) await BackgroundJob.stop();
};
