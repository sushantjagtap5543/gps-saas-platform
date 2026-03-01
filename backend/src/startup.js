const { fork } = require("child_process");
const path = require("path");
const logger = require("./utils/logger");

function spawnWorker(name, file) {
  const worker = fork(path.join(__dirname, file), [], {
    env: process.env,
    silent: false
  });
  worker.on("exit", (code) => {
    logger.warn("[STARTUP] Worker " + name + " exited with code " + code + " — restarting in 5s");
    setTimeout(() => spawnWorker(name, file), 5000);
  });
  worker.on("error", (err) => logger.error("[STARTUP] Worker " + name + " error: " + err.message));
  logger.info("[STARTUP] Spawned worker: " + name);
  return worker;
}

// Run background workers as separate forked processes so they never block the API server
spawnWorker("gps-worker",        "./modules/geofence/gps.worker");
spawnWorker("analytics-worker",  "./modules/analytics/analytics.worker");

// Jobs are lightweight intervals — safe to run inline
require("./jobs/subscription.job");
require("./jobs/health.job");

logger.info("[STARTUP] All workers and jobs initialised");
