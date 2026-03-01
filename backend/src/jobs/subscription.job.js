const { Op } = require("sequelize");
const db     = require("../models");
const logger = require("../utils/logger");

async function expireSubscriptions() {
  try {
    const [count] = await db.Subscription.update(
      { status: "EXPIRED" },
      { where: { end_date: { [Op.lt]: new Date() }, status: "ACTIVE" } }
    );
    if (count > 0)
      logger.info(`[SUB JOB] Expired ${count} subscription(s)`);
  } catch (err) {
    logger.error("[SUB JOB] " + err.message);
  }
}

// Run immediately on startup, then every 24 hours
expireSubscriptions();
setInterval(expireSubscriptions, 86400000);
logger.info("[SUB JOB] Started");
