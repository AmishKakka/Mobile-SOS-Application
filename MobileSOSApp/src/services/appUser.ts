import { fetchUserAttributes, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { API_BASE_URL } from '../config/config';

export type AppUser = {
  userId: string;
  cognitoId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  isHelperAvailable: boolean;
};

async function getAuthHeaders() {
  const token = await getCurrentIdToken();

  if (!token) {
    throw new Error('Authenticated session is missing an ID token.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function fetchWithAuth(
  path: string,
  init: RequestInit,
  headers: Record<string, string>,
) {
  const url = `${API_BASE_URL}${path}`;

  try {
    return await fetch(url, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers || {}),
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Unknown network error';
    throw new Error(
      `Network request failed for ${url}. ${message}. Check BACKEND_ORIGIN, ALB health, and Android cleartext HTTP settings.`
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCurrentIdToken(options?: {
  retries?: number;
  delayMs?: number;
  forceRefresh?: boolean;
}) {
  const retries = options?.retries ?? 5;
  const delayMs = options?.delayMs ?? 350;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const session = await fetchAuthSession({
      forceRefresh: options?.forceRefresh === true && attempt === retries,
    });
    const token = session.tokens?.idToken?.toString() || null;

    if (token) {
      return token;
    }

    if (attempt < retries) {
      await sleep(delayMs);
    }
  }

  return null;
}

function normalizeUser(raw: any): AppUser {
  return {
    userId: String(raw?._id || ''),
    cognitoId: String(raw?.cognitoId || ''),
    firstName: String(raw?.firstName || ''),
    lastName: String(raw?.lastName || ''),
    name:
      String(raw?.name || '').trim()
      || [raw?.firstName, raw?.lastName].filter(Boolean).join(' ').trim()
      || String(raw?.email || ''),
    email: String(raw?.email || ''),
    role: String(raw?.role || 'victim'),
    isHelperAvailable: Boolean(raw?.isHelperAvailable),
  };
}

export async function syncAuthenticatedUser() {
  const headers = await getAuthHeaders();
  const currentUser = await getCurrentUser();
  const attributes = await fetchUserAttributes();

  const response = await fetchWithAuth('/users/sync', {
    method: 'POST',
    body: JSON.stringify({
      cognitoId: currentUser.userId,
      email: attributes.email,
      firstName: attributes.given_name,
      lastName: attributes.family_name,
    }),
  }, headers);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to sync authenticated user: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return normalizeUser(payload.user);
}

export async function getCurrentAppUser(): Promise<AppUser> {
  const headers = await getAuthHeaders();

  let response = await fetchWithAuth('/users/profile', {
    method: 'GET',
  }, headers);

  if (response.status === 404) {
    await syncAuthenticatedUser();
    response = await fetchWithAuth('/users/profile', {
      method: 'GET',
    }, headers);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load current user: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return normalizeUser(payload);
}

export async function updateCurrentUserDevice({
  fcmToken,
  role,
}: {
  fcmToken?: string | null;
  role?: string;
}) {
  const headers = await getAuthHeaders();
  const response = await fetchWithAuth('/users/device', {
    method: 'PUT',
    body: JSON.stringify({
      ...(fcmToken !== undefined ? { fcmToken } : {}),
      ...(role ? { role } : {}),
    }),
  }, headers);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update device state: ${response.status} ${text}`);
  }

  return normalizeUser(await response.json());
}

export async function updateCurrentUserStatus({
  isHelperAvailable,
  lastKnownLocation,
  role,
}: {
  isHelperAvailable?: boolean;
  lastKnownLocation?: { lat: number; lng: number };
  role?: string;
}) {
  const headers = await getAuthHeaders();
  const response = await fetchWithAuth('/users/status', {
    method: 'PUT',
    body: JSON.stringify({
      ...(typeof isHelperAvailable === 'boolean' ? { isHelperAvailable } : {}),
      ...(lastKnownLocation ? { lastKnownLocation } : {}),
      ...(role ? { role } : {}),
    }),
  }, headers);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update user status: ${response.status} ${text}`);
  }

  return normalizeUser(await response.json());
}
