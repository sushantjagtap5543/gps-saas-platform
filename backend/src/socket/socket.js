const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || "*", methods: ["GET","POST"], credentials: true },
    transports: ["websocket","polling"]
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch { next(new Error("Invalid token")); }
  });

  io.on("connection", (socket) => {
    logger.info("[SOCKET] Connected: " + socket.user?.id);
    socket.join("user_" + socket.user.id);
    socket.on("subscribe_device",   (id) => socket.join("device_" + id));
    socket.on("unsubscribe_device", (id) => socket.leave("device_" + id));
    socket.on("disconnect", () => logger.info("[SOCKET] Disconnected: " + socket.id));
  });

  return io;
}

function emitLocationUpdate(deviceId, data) { if (io) io.to("device_" + deviceId).emit("location_update", data); }
function emitAlert(userId, alert)           { if (io) io.to("user_" + userId).emit("alert", alert); }

module.exports = { initSocket, emitLocationUpdate, emitAlert };
