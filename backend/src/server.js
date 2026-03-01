require("dotenv").config();
const http   = require("http");
const app    = require("./app");
const { initSocket }  = require("./socket/socket");
const { sequelize }   = require("./models");
const logger = require("./utils/logger");

// ── Early environment validation ──────────────────────────────
const REQUIRED_ENV = [
  "POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_DB",
  "POSTGRES_USER", "POSTGRES_PASSWORD",
  "JWT_SECRET", "JWT_REFRESH_SECRET"
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`[FATAL] Missing required environment variables: ${missing.join(", ")}`);
  console.error("        Check your .env.production file and docker-compose.yml");
  process.exit(1);
}
if (process.env.JWT_SECRET.startsWith("REPLACE_") ||
    process.env.JWT_REFRESH_SECRET.startsWith("REPLACE_")) {
  // eslint-disable-next-line no-console
  console.error("[FATAL] JWT_SECRET / JWT_REFRESH_SECRET are still placeholder values.");
  console.error("        Run: openssl rand -hex 64  and update .env.production");
  process.exit(1);
}

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
