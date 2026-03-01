import { io } from "socket.io-client";

export const socket = io("http://yourdomain.com", {
  auth: { token: localStorage.getItem("token") }
});