import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/keys';

// ── Point this at your backend ───────────────────────────────────────────────
// Local dev  : 'http://localhost:3000'   (backend running locally / docker)
// Use your device IP address instead of "localhost" using -> ipconfig getifaddr en0
// Production : your ALB DNS from terraform output
const BACKEND_URL = 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }

  return socket;
}

export function registerSocketUser(userId: string, role: string, name?: string) {
  const activeSocket = getSocket();

  const emitRegistration = () => {
    activeSocket.emit('register_user', { userId, role, name });
  };

  if (activeSocket.connected) {
    emitRegistration();
  } else {
    activeSocket.once('connect', emitRegistration);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
