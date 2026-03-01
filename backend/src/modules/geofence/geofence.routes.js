const router = require("express").Router();
const controller = require("./geofence.controller");
const auth = require("../../security/auth.middleware");

router.post("/", auth, controller.create);
router.get("/", auth, controller.list);

module.exports = router;