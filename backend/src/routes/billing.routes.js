const router = require("express").Router();
const billing = require("../controllers/billing.controller");
const webhook = require("../controllers/webhook.controller");

router.post("/create-order", billing.createOrder);
router.post("/webhook", webhook.handleWebhook);

module.exports = router;