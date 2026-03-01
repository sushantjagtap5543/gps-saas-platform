const router = require("express").Router();
const controller = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

router.post("/register", controller.register);
router.post("/login",    controller.login);
router.post("/refresh",  controller.refresh);
router.get("/me",        auth, controller.me);

module.exports = router;
