import { io } from "socket.io-client";

// iOS Simulator: http://localhost:3000
// Android Emulator: http://10.0.2.2:3000
// Real phone: http://YOUR_MAC_LAN_IP:3000  (e.g. http://192.168.1.50:3000)
const SOCKET_URL = "http://localhost:3000";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
  reconnection: true,
});

