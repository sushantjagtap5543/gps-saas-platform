const crypto = require("crypto");
const db = require("../models");
const logger = require("../utils/logger");

exports.handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const body = req.body;
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(typeof body === "string" ? body : JSON.stringify(body));
    const digest = shasum.digest("hex");
    if (digest !== req.headers["x-razorpay-signature"]) return res.status(400).json({ message: "Invalid signature" });
    const event = typeof body === "string" ? JSON.parse(body) : body;
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const userId = payment.notes?.user_id;
      const planId = payment.notes?.plan_id;
      if (!userId || !planId) return res.json({ status: "skipped" });
      const plan = await db.Plan.findByPk(planId);
      if (!plan) return res.json({ status: "plan_not_found" });
      await db.Subscription.update({ status: "EXPIRED" }, { where: { user_id: userId, status: "ACTIVE" } });
      await db.Subscription.create({ user_id: userId, plan_id: planId, start_date: new Date(), end_date: new Date(Date.now() + plan.duration_days * 86400000), status: "ACTIVE", razorpay_order_id: payment.order_id, razorpay_payment_id: payment.id });
      logger.info("[WEBHOOK] Subscription activated for user: " + userId);
    }
    return res.json({ status: "ok" });
  } catch (err) {
    logger.error("[WEBHOOK] " + err.message);
    return res.status(500).json({ message: "Webhook failed" });
  }
};
