const crypto = require("crypto");
const db = require("../models");

exports.handleWebhook = async (req, res) => {

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== req.headers["x-razorpay-signature"]) {
    return res.status(400).send("Invalid signature");
  }

  const event = req.body;

  if (event.event === "payment.captured") {

    const userId = event.payload.payment.entity.notes.user_id;
    const planId = event.payload.payment.entity.notes.plan_id;

    const plan = await db.sequelize.models.plans.findByPk(planId);

    await db.Subscription.create({
      client_name: userId,
      end_date: new Date(Date.now() + plan.duration_days * 86400000),
      status: "ACTIVE"
    });
  }

  res.json({ status: "ok" });
};