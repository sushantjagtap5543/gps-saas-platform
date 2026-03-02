const db = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Run daily: check subscriptions, apply grace period, expire, suspend
 */
exports.runSubscriptionCheck = async () => {
  try {
    const now   = new Date();
    const grace = parseInt(process.env.GRACE_PERIOD_DAYS || "7");

    // 1. Active → GRACE (just expired, still in grace window)
    const expiredActive = await db.Subscription.findAll({
      where: { status: "ACTIVE", end_date: { [Op.lt]: now } }
    });
    for (const sub of expiredActive) {
      const graceEnd = new Date(sub.end_date);
      graceEnd.setDate(graceEnd.getDate() + grace);
      await sub.update({ status: "GRACE", grace_end_date: graceEnd });
      logger.info(`[SUB] GRACE: user ${sub.user_id} — grace until ${graceEnd.toDateString()}`);
    }

    // 2. GRACE → EXPIRED (grace period done)
    const graceExpired = await db.Subscription.findAll({
      where: { status: "GRACE", grace_end_date: { [Op.lt]: now } }
    });
    for (const sub of graceExpired) {
      await sub.update({ status: "EXPIRED" });
      // Suspend all devices
      await db.Device.update({ status: "SUSPENDED" }, { where: { tenant_id: sub.user_id } });
      logger.info(`[SUB] EXPIRED: user ${sub.user_id} — devices suspended`);
    }

    logger.info(`[SUB] Check done: ${expiredActive.length} to grace, ${graceExpired.length} expired`);
  } catch (err) {
    logger.error("[SUB] Job error: " + err.message);
  }
};
