import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/keys';

export type DemoRole = 'victim' | 'helper';

export interface DemoSession {
  userId: string;
  name: string;
  role: DemoRole;
}

const ACTIVE_ROLE_KEY = '@safeguard_active_role';

function storageKey(role: DemoRole) {
  return `@safeguard_demo_profile:${role}`;
}

function buildDemoId(role: DemoRole) {
  return `${role}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function setActiveDeviceRole(role: DemoRole) {
  await AsyncStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export async function getActiveDeviceRole(): Promise<DemoRole | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_ROLE_KEY);
  return raw === 'helper' || raw === 'victim' ? raw : null;
}

export async function getStoredDemoSession(role: DemoRole): Promise<DemoSession | null> {
  const raw = await AsyncStorage.getItem(storageKey(role));

  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as Partial<DemoSession>;
  if (!parsed.userId) {
    return null;
  }

  return {
    userId: parsed.userId,
    name:
      parsed.name ||
      (role === 'helper' ? 'Community Helper' : 'SafeGuard User'),
    role,
  };
}

export async function getOrCreateDemoSession(
  role: DemoRole,
  preferredName?: string,
): Promise<DemoSession> {
  const existing = await getStoredDemoSession(role);

  if (existing) {
    const session: DemoSession = {
      ...existing,
      name: preferredName || existing.name,
    };
    await AsyncStorage.setItem(storageKey(role), JSON.stringify(session));
    return session;
  }

  const session: DemoSession = {
    userId: buildDemoId(role),
    name: preferredName || (role === 'helper' ? 'Community Helper' : 'SafeGuard User'),
    role,
  };

  await AsyncStorage.setItem(storageKey(role), JSON.stringify(session));
  return session;
}

export async function syncDemoSession(
  session: DemoSession,
  extra: Record<string, unknown> = {},
) {
  const response = await fetch(`${API_BASE_URL}/users/${session.userId}/device`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: session.name,
      role: session.role,
      ...extra,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to sync user profile: ${response.status} ${text}`);
  }

  return response.json();
}

export async function updateHelperAvailability(
  userId: string,
  isHelperAvailable: boolean,
  lastKnownLocation?: { lat: number; lng: number },
) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      isHelperAvailable,
      ...(lastKnownLocation ? { lastKnownLocation } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update helper status: ${response.status} ${text}`);
  }

  return response.json();
}
