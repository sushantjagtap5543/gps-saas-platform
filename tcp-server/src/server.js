require("dotenv").config();
const net = require("net");
const { validatePacket, parsePacket } = require("./protocols/gt06/parser");
const handlePacket = require("./protocols/gt06/handlers");
const { remove: removeSession } = require("./sessions/sessionManager");

const PORT = parseInt(process.env.TCP_PORT) || 5000;

const server = net.createServer((socket) => {
  let deviceImei = null;
  let buffer = Buffer.alloc(0);

  socket.setKeepAlive(true, 30000);
  socket.setTimeout(120000);

  socket.on("data", (data) => {
    try {
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= 10) {
        if (buffer[0] !== 0x78 || buffer[1] !== 0x78) { buffer = buffer.slice(1); continue; }
        const packetLen = buffer[2] + 5;
        if (buffer.length < packetLen) break;
        const packet = buffer.slice(0, packetLen);
        buffer = buffer.slice(packetLen);
        if (!validatePacket(packet)) { console.warn("[TCP] Invalid CRC — dropped"); continue; }
        const parsed = parsePacket(packet);
        if (parsed.type === "login") deviceImei = parsed.imei;
        handlePacket(socket, parsed, deviceImei);
      }
    } catch (err) { console.error("[TCP] Error:", err.message); }
  });

  socket.on("timeout", () => { console.warn("[TCP] Timeout: " + deviceImei); socket.destroy(); });
  socket.on("close",   () => { if (deviceImei) removeSession(deviceImei); });
  socket.on("error",   (err) => console.error("[TCP] Socket error " + deviceImei + ":", err.message));
});

server.on("error", (err) => {
  console.error("[TCP SERVER]", err.message);
  if (err.code === "EADDRINUSE") process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => console.log("[TCP SERVER] Listening on port " + PORT));
module.exports = server;
