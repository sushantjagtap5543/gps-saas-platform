require("dotenv").config();
const http   = require("http");
const app    = require("./app");
const { initSocket } = require("./socket/socket");
const { sequelize }  = require("./models");
const logger = require("./utils/logger");

const PORT   = parseInt(process.env.API_PORT) || 3000;
const server = http.createServer(app);
initSocket(server);

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      logger.info("[DB] PostgreSQL connected");
      break;
    } catch (err) {
      retries--;
      logger.warn("[DB] Connection failed (" + retries + " retries left): " + err.message);
      if (retries === 0) { logger.error("[FATAL] Cannot connect to DB"); process.exit(1); }
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Sync models (alter: safe for production — won't drop columns)
  try {
    await sequelize.sync({ alter: false });
    logger.info("[DB] Models synced");
  } catch (err) {
    logger.warn("[DB] Sync warning (non-fatal): " + err.message);
  }

  server.listen(PORT, "0.0.0.0", () => {
    logger.info("[SERVER] Running on port " + PORT);
    // Start workers ONLY after server is listening and DB is connected
    require("./startup");
  });
}

process.on("SIGTERM", async () => {
  logger.info("[SERVER] Graceful shutdown...");
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
});

process.on("unhandledRejection", (r) => logger.error("[UNHANDLED] " + String(r)));
process.on("uncaughtException",  (e) => { logger.error("[UNCAUGHT] " + e.message); process.exit(1); });

start();
