import { io } from "socket.io-client";
export const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
  auth: { token: localStorage.getItem("token") },
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000
});
