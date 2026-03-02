const { Server } = require("socket.io");
<<<<<<< Updated upstream
const jwt    = require("jsonwebtoken");
const Redis  = require("ioredis");
=======
const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
>>>>>>> Stashed changes
const logger = require("../utils/logger");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin:      process.env.CORS_ORIGIN || "*",
      methods:     ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"]
  });

  // ── JWT auth middleware ─────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info("[SOCKET] Connected: " + socket.user?.id);
    socket.join("user_" + socket.user.id);
    socket.on("subscribe_device",   (id) => socket.join("device_" + id));
    socket.on("unsubscribe_device", (id) => socket.leave("device_" + id));
    socket.on("disconnect", () => logger.info("[SOCKET] Disconnected: " + socket.id));
  });

<<<<<<< Updated upstream
  // ── Redis pub/sub relay ────────────────────────────────────────
  // GPS worker and alert service run as forked child processes where
  // io === null. They publish to Redis channels; we relay to clients here.
  const subscriber = new Redis({
    host:          process.env.REDIS_HOST || "localhost",
    port:          parseInt(process.env.REDIS_PORT) || 6379,
=======
  // -------------------------------------------------------
  // Redis Pub/Sub relay — receives events from child workers
  // that cannot access the socket.io instance directly
  // -------------------------------------------------------
  const subscriber = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT) || 6379,
>>>>>>> Stashed changes
    retryStrategy: (t) => Math.min(t * 200, 5000)
  });

  subscriber.subscribe("socket:location", "socket:alert", (err) => {
    if (err) logger.error("[SOCKET] Redis subscribe error: " + err.message);
<<<<<<< Updated upstream
    else     logger.info("[SOCKET] Subscribed to Redis pub/sub channels");
=======
    else logger.info("[SOCKET] Subscribed to Redis socket channels");
>>>>>>> Stashed changes
  });

  subscriber.on("message", (channel, message) => {
    try {
      const payload = JSON.parse(message);
      if (channel === "socket:location") {
<<<<<<< Updated upstream
        io.to("device_" + payload.deviceId).emit("location_update", payload.data);
      } else if (channel === "socket:alert") {
        io.to("user_" + payload.userId).emit("alert", payload.data);
      }
    } catch (err) {
      logger.error("[SOCKET] Redis message parse error: " + err.message);
    }
  });

  subscriber.on("error", (e) => logger.error("[SOCKET] Subscriber error: " + e.message));
=======
        if (io) io.to("device_" + payload.deviceId).emit("location_update", payload.data);
      } else if (channel === "socket:alert") {
        if (io) io.to("user_" + payload.userId).emit("alert", payload.data);
      }
    } catch (err) {
      logger.error("[SOCKET] Failed to parse Redis message: " + err.message);
    }
  });

  subscriber.on("error", (e) => logger.error("[SOCKET] Redis subscriber error: " + e.message));
>>>>>>> Stashed changes

  return io;
}

<<<<<<< Updated upstream
// Direct emitters — used when called from the main process
function emitLocationUpdate(deviceId, data) {
  if (io) io.to("device_" + deviceId).emit("location_update", data);
}
function emitAlert(userId, alert) {
  if (io) io.to("user_" + userId).emit("alert", alert);
}
=======
// Direct emitters (used when called from main process — keep for compatibility)
function emitLocationUpdate(deviceId, data) { if (io) io.to("device_" + deviceId).emit("location_update", data); }
function emitAlert(userId, alert)           { if (io) io.to("user_" + userId).emit("alert", alert); }
>>>>>>> Stashed changes

module.exports = { initSocket, emitLocationUpdate, emitAlert };
