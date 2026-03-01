require("dotenv").config();
const http   = require("http");
const app    = require("./app");
const { initSocket }  = require("./socket/socket");
const { sequelize }   = require("./models");
const logger = require("./utils/logger");

const PORT   = parseInt(process.env.API_PORT) || 3000;
const server = http.createServer(app);
initSocket(server);

async function start() {
  // ── Wait for PostgreSQL ──────────────────────────────────────
  let retries = 15;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      logger.info("[DB] PostgreSQL connected");
      break;
    } catch (err) {
      retries--;
      logger.warn(`[DB] Connection failed (${retries} retries left): ${err.message}`);
      if (retries === 0) {
        logger.error("[FATAL] Cannot connect to PostgreSQL after 15 attempts");
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ── Sync models ───────────────────────────────────────────────
  try {
    await sequelize.sync({ alter: false });
    logger.info("[DB] Models synced");
  } catch (err) {
    logger.warn("[DB] Sync warning (non-fatal): " + err.message);
  }

  // ── Start server ──────────────────────────────────────────────
  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`[SERVER] Running on port ${PORT}`);
    require("./startup");
  });
}

// ── Graceful shutdown ─────────────────────────────────────────
process.on("SIGTERM", async () => {
  logger.info("[SERVER] Graceful shutdown...");
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
});

process.on("unhandledRejection", (r) =>
  logger.error("[UNHANDLED REJECTION] " + String(r))
);
process.on("uncaughtException", (e) => {
  logger.error("[UNCAUGHT EXCEPTION] " + e.message);
  process.exit(1);
});

start();
