const router = require("express").Router();
const ctrl   = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.post("/register",         ctrl.register);
router.post("/login",            ctrl.login);
router.post("/refresh",          ctrl.refresh);
router.get("/me",                authenticate, ctrl.me);
router.put("/profile",           authenticate, ctrl.updateProfile);
router.put("/change-password",   authenticate, ctrl.changePassword);

module.exports = router;
