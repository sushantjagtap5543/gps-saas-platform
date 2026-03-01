const { Op } = require("sequelize");
const db     = require("../models");
const logger = require("../utils/logger");

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

async function markOffline() {
  try {
    const [count] = await db.Device.update(
      { status: "offline" },
      {
        where: {
          last_seen: { [Op.lt]: new Date(Date.now() - OFFLINE_THRESHOLD_MS) },
          status:    "online"
        }
      }
    );
    if (count > 0)
      logger.info(`[HEALTH JOB] Marked ${count} device(s) offline`);
  } catch (err) {
    logger.error("[HEALTH JOB] " + err.message);
  }
}

// Run immediately on startup, then every 60 seconds
markOffline();
setInterval(markOffline, 60000);
logger.info("[HEALTH JOB] Started");
