const router = require("express").Router();
const auth    = require("../middleware/auth.middleware");
const billing = require("../controllers/billing.controller");
const webhook = require("../controllers/webhook.controller");

router.post("/webhook", webhook.handleWebhook);
router.use(auth);
router.get("/plans",         billing.getPlans);
router.post("/create-order", billing.createOrder);
router.get("/subscription",  billing.getSubscription);

module.exports = router;
