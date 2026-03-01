const db = require("../../models");
const { createOrder } = require("./razorpay.service");

exports.createSubscriptionOrder = async (user, planId) => {
  const plan = await db.Plan.findByPk(planId);

  const order = await createOrder(plan.price);

  return { order, plan };
};

exports.activateSubscription = async (userId, planId, paymentId) => {
  const plan = await db.Plan.findByPk(planId);

  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + plan.duration_days);

  return await db.Subscription.create({
    user_id: userId,
    plan_id: planId,
    start_date: start,
    end_date: end,
    razorpay_payment_id: paymentId
  });
};