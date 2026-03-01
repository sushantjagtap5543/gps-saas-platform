import { io } from "socket.io-client";

const socket = io("http://your-backend-url", {
  auth: {
    token: localStorage.getItem("token")
  }
});

export default socket;