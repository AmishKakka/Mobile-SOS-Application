// src/services/socket.ts
import { Platform } from "react-native";
import { io, Socket } from "socket.io-client";

const DEFAULT_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000";

// ✅ You can override without changing code:
// EXPO_PUBLIC_SOCKET_URL="http://192.168.1.50:3000"
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? DEFAULT_URL;

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
    });
  }
  return socket;
}