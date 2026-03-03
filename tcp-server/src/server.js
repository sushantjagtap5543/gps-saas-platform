require("dotenv").config();
const net     = require("net");
const dgram   = require("dgram");
const logger  = require("./utils/logger");
const { handlePacket } = require("./protocols/gt06/handlers");
const sessions = require("./sessions/sessionManager");

const TCP_PORT = parseInt(process.env.TCP_PORT || "5000");

// ── TCP SERVER ─────────────────────────────────────────────
const tcpServer = net.createServer((socket) => {
  const addr = `${socket.remoteAddress}:${socket.remotePort}`;
  logger.info(`[TCP] Connected: ${addr}`);

  socket.on("data", async (data) => {
    try {
      await handlePacket(socket, data, "TCP");
    } catch (err) {
      logger.error(`[TCP] Packet error from ${addr}: ${err.message}`);
    }
  });

  socket.on("close", () => {
    const imei = sessions.getImeiBySocket(socket);
    if (imei) {
      sessions.removeSession(imei);
      require("./services/gpsPublisher").publishOffline(imei);
      logger.info(`[TCP] Disconnected: ${imei}`);
    }
  });

  socket.on("error", (err) => {
    if (err.code !== "ECONNRESET") logger.error(`[TCP] Socket error: ${err.message}`);
  });

  // Keep-alive
  socket.setKeepAlive(true, 60000);
  socket.setTimeout(300000, () => { socket.destroy(); }); // 5 min timeout
});

tcpServer.listen(TCP_PORT, "0.0.0.0", () => {
  logger.info(`[TCP] Server listening on :${TCP_PORT}`);
});

// ── UDP SERVER ─────────────────────────────────────────────
const udpServer = dgram.createSocket("udp4");

udpServer.on("message", async (msg, rinfo) => {
  try {
    await handlePacket({ write: (data) => udpServer.send(data, rinfo.port, rinfo.address) }, msg, "UDP");
  } catch (err) {
    logger.error(`[UDP] Error: ${err.message}`);
  }
});

udpServer.bind(TCP_PORT, () => {
  logger.info(`[UDP] Server listening on :${TCP_PORT}`);
});

// ── COMMAND DISPATCHER (polls Redis) ──────────────────────
async function startCommandDispatcher() {
  const Redis = require("ioredis");
  const redis = new Redis({
    host:     process.env.REDIS_HOST || "redis",
    port:     parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  });

  logger.info("[CMD] Command dispatcher started");

  while (true) {
    try {
      const result = await redis.blpop("cmd:queue", 5);
      if (!result) continue;

      const { cmdId, imei, command } = JSON.parse(result[1]);
      const socket = sessions.getSocketByImei(imei);

      if (!socket) {
        logger.warn(`[CMD] Device offline: ${imei} — cmd ${cmdId}`);
        // Update DB status
        const { Pool } = require("pg");
        const pool = new Pool({ host: process.env.DB_HOST || "postgres", database: process.env.DB_NAME || "gps_tracking", user: process.env.DB_USER || "postgres", password: process.env.DB_PASSWORD });
        await pool.query("UPDATE command_queue SET status=$1, error_msg=$2 WHERE id=$3", ["FAILED","Device offline",cmdId]);
        await pool.end();
        continue;
      }

      // Build GT06 command packet (simplified — extend per protocol)
      const cmdBuf = buildCommandPacket(imei, command);
      socket.write(cmdBuf);

      logger.info(`[CMD] Sent: ${command} → ${imei}`);

      // Update DB
      const { Pool } = require("pg");
      const pool = new Pool({ host: process.env.DB_HOST || "postgres", database: process.env.DB_NAME || "gps_tracking", user: process.env.DB_USER || "postgres", password: process.env.DB_PASSWORD });
      await pool.query("UPDATE command_queue SET status=$1, sent_at=NOW() WHERE id=$2", ["SENT", cmdId]);
      await pool.end();

    } catch (err) {
      logger.error("[CMD] Dispatcher error: " + err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

function buildCommandPacket(imei, command) {
  // GT06 protocol command format (simplified)
  // Real implementation varies per device model
  const cmd = Buffer.from(`SERVER,${Date.now()},${command},#`, "ascii");
  const header = Buffer.from([0x78, 0x78]);
  const length = Buffer.alloc(1);
  length.writeUInt8(cmd.length + 3);
  const msgType = Buffer.from([0x80]);
  const checksum = Buffer.alloc(2); // TODO: proper CRC16
  const stop = Buffer.from([0x0D, 0x0A]);
  return Buffer.concat([header, length, msgType, cmd, checksum, stop]);
}

// Start command dispatcher (non-blocking)
startCommandDispatcher().catch(err => logger.error("[CMD] Fatal: " + err.message));

process.on("SIGTERM", () => {
  tcpServer.close();
  udpServer.close();
  process.exit(0);
});
