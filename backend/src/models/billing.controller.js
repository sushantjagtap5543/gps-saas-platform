const service = require("./billing.service");

exports.subscribe = async (req, res) => {
  const { planId } = req.body;

  const result = await service.createSubscriptionOrder(req.user, planId);
  res.json(result);
};

exports.webhook = async (req, res) => {
  const paymentId = req.body.payload.payment.entity.id;
  const userId = req.body.payload.payment.entity.notes.user_id;
  const planId = req.body.payload.payment.entity.notes.plan_id;

  await service.activateSubscription(userId, planId, paymentId);

  res.json({ status: "activated" });
};