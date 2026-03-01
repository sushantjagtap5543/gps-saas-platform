const router = require("express").Router();
const auth   = require("../middleware/auth.middleware");
const sub    = require("../middleware/subscription.middleware");
const ctrl   = require("../controllers/device.controller");

router.use(auth);
router.get("/",             ctrl.getAll);
router.get("/:id",          ctrl.getOne);
router.get("/:id/history",  ctrl.getHistory);
router.post("/",            sub, ctrl.create);
router.put("/:id",          ctrl.update);
router.delete("/:id",       ctrl.remove);

module.exports = router;
