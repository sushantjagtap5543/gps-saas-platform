import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
  auth: { token: localStorage.getItem("token") }, autoConnect: false, reconnection: true
});
export default socket;
