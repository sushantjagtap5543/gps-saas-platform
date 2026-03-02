require("dotenv").config();
const http       = require("http");
const app        = require("./app");
const { connectDB } = require("./models");
const logger     = require("./utils/logger");
const cron       = require("node-cron");
const { runSubscriptionCheck } = require("./jobs/subscription.job");
const { initSocket } = require("./socket/socket");

const PORT = parseInt(process.env.PORT || "5024");

async function start() {
  await connectDB();

  const server = http.createServer(app);
  const io = initSocket(server);
  app.set("io", io);  // expose io for simulate endpoint

  server.listen(PORT, "0.0.0.0", () => {
    logger.info(`[SERVER] GPS Backend v2.0 running on :${PORT}`);
    logger.info(`[SERVER] Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // ── CRON JOBS ─────────────────────────────────────────────
  // Daily subscription check at 1:00 AM
  cron.schedule("0 1 * * *", () => {
    logger.info("[CRON] Running subscription check...");
    runSubscriptionCheck();
  });

  // Command retry every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    const { retryPending } = require("./services/command.service");
    await retryPending().catch(err => logger.error("[CRON] Command retry: " + err.message));
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("[SERVER] Shutting down…");
    server.close(() => {
      logger.info("[SERVER] Closed");
      process.exit(0);
    });
  });
}

start().catch(err => {
  logger.error("[SERVER] Fatal: " + err.message);
  process.exit(1);
});
