const razorpay = require("../config/razorpay");
const db = require("../models");

exports.createOrder = async (req, res) => {

  const plan = await db.sequelize.models.plans.findByPk(req.body.plan_id);

  const order = await razorpay.orders.create({
    amount: plan.price,
    currency: "INR",
    receipt: `receipt_${Date.now()}`
  });

  res.json(order);
};