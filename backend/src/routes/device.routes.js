const router = require("express").Router();
const ctrl   = require("../controllers/device.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.use(authenticate);
router.get("/models",           ctrl.getModels);
router.get("/live",             ctrl.getLiveAll);    // all devices with live GPS
router.post("/simulate",        ctrl.simulate);       // GPS simulator injection
router.get("/",                 ctrl.list);
router.post("/",                ctrl.create);
router.get("/:id/qr", ctrl.getQRCode);
router.get("/:id",              ctrl.getOne);
router.put("/:id",              ctrl.update);
router.delete("/:id",           ctrl.delete);
router.get("/:id/history",      ctrl.getHistory);
router.get("/:id/trips",        ctrl.getTrips);
router.get("/:id/analytics",    ctrl.getAnalytics);
module.exports = router;
