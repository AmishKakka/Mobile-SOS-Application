/**
 * socketService.ts
 * Manages the single Socket.IO connection to the SafeGuard backend.
 * Keeps the socket as a singleton so it's shared across the app.
 */

import { io, Socket } from 'socket.io-client';

// ── Point this at your backend ───────────────────────────────────────────────
// Local dev  : 'http://localhost:3000'   (backend running locally / docker)
// Use your device IP address instead of "localhost" using -> ipconfig getifaddr en0
// Production : your ALB DNS from terraform output
const BACKEND_URL = 'http://10.0.2.2:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () =>
      console.log('[Socket] Connected to backend:', socket?.id),
    );
    socket.on('disconnect', (reason) =>
      console.log('[Socket] Disconnected:', reason),
    );
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}