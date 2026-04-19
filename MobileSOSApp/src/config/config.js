import {
  BACKEND_ORIGIN as BACKEND_ORIGIN_ENV,
  GOOGLE_MAPS_API_KEY as GOOGLE_MAPS_API_KEY_ENV,
} from '@env';

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

const BACKEND_ORIGIN = normalizeOrigin(BACKEND_ORIGIN_ENV);

if (!BACKEND_ORIGIN) {
  throw new Error(
    'Missing BACKEND_ORIGIN in MobileSOSApp/.env. Set it to your deployed backend origin before running the app.'
  );
}

export const API_BASE_URL = `${BACKEND_ORIGIN}/api`;
export const SOCKET_URL = BACKEND_ORIGIN;
export const GOOGLE_MAPS_API_KEY = String(GOOGLE_MAPS_API_KEY_ENV || '').trim();
