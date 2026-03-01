const db = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

setInterval(async () => {
  try {
    const [count] = await db.Device.update({ status: "offline" }, { where: { last_seen: { [Op.lt]: new Date(Date.now() - 300000) }, status: "online" } });
    if (count > 0) logger.info("[HEALTH JOB] Marked " + count + " devices offline");
  } catch (err) { logger.error("[HEALTH JOB] " + err.message); }
}, 60000);

logger.info("[HEALTH JOB] Started");
