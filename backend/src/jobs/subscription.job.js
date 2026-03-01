const db = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

setInterval(async () => {
  try {
    const [count] = await db.Subscription.update({ status: "EXPIRED" }, { where: { end_date: { [Op.lt]: new Date() }, status: "ACTIVE" } });
    if (count > 0) logger.info("[SUB JOB] Expired " + count + " subscriptions");
  } catch (err) { logger.error("[SUB JOB] " + err.message); }
}, 86400000);

logger.info("[SUB JOB] Started");
