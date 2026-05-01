import { API_BASE_URL } from '../config/config';
import { getCurrentIdToken } from './appUser';

async function parseErrorResponse(response: Response, fallback: string) {
  const text = await response.text();

  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(text);
    return payload?.message || payload?.error || fallback;
  } catch {
    return text;
  }
}

async function requestSecurityPin(
  path: string,
  method: 'PUT' | 'POST',
  pin: string,
) {
  const token = await getCurrentIdToken();

  if (!token) {
    throw new Error('Your session expired. Please sign in again.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pin }),
  });

  if (!response.ok) {
    const message = await parseErrorResponse(
      response,
      'Security PIN request failed.',
    );
    throw new Error(message);
  }

  return response.json();
}

export async function setSecurityPin(pin: string) {
  return requestSecurityPin('/users/security-pin', 'PUT', pin);
}

export async function verifySecurityPin(pin: string): Promise<boolean> {
  const payload = await requestSecurityPin(
    '/users/security-pin/verify',
    'POST',
    pin,
  );

  return payload?.verified === true;
}
