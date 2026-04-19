import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/config';
import { getCurrentIdToken } from './appUser';

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

export async function registerSocketUser(userId: string, role: string, name?: string) {
  const activeSocket = getSocket();
  const token = await getCurrentIdToken();

  if (!token) {
    throw new Error('Missing authenticated token for socket registration.');
  }

  const emitRegistration = () => {
    activeSocket.emit('register_user', { userId, role, name, token });
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
