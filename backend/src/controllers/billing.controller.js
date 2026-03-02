const getRazorpay = require("../config/razorpay");
const db          = require("../models");
const logger      = require("../utils/logger");

exports.getPlans = async (req, res) => {
  try {
    const plans = await db.Plan.findAll({ order: [["price", "ASC"]] });
    return res.json(plans);
  } catch (err) {
    logger.error("[BILLING] getPlans: " + err.message);
    return res.status(500).json({ message: "Failed to fetch plans" });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { plan_id } = req.body;
    if (!plan_id) return res.status(400).json({ message: "plan_id required" });

    const plan = await db.Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   plan.price,
      currency: "INR",
      receipt:  "rcpt_" + Date.now(),
      notes:    { user_id: req.user.id, plan_id: plan.id }
    });

    return res.json({
      order_id:  order.id,
      amount:    order.amount,
      currency:  order.currency,
      key:       process.env.RAZORPAY_KEY,
      plan_name: plan.name
    });
  } catch (err) {
    logger.error("[BILLING] createOrder: " + err.message);
    // Return a clear message if keys are not configured
    if (err.message.includes("not configured")) {
      return res.status(503).json({ message: "Billing not configured on this server" });
    }
    return res.status(500).json({ message: "Failed to create order" });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const sub = await db.Subscription.findOne({
      where:   { user_id: req.user.id, status: "ACTIVE" },
      include: [db.Plan]
    });
    return res.json(sub || { status: "NONE" });
  } catch (err) {
    logger.error("[BILLING] getSubscription: " + err.message);
    return res.status(500).json({ message: "Failed to fetch subscription" });
  }
};
