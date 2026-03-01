const router = require("express").Router();
const controller = require("./branding.controller");
const auth = require("../../security/auth.middleware");
const rbac = require("../rbac/rbac.middleware");

router.get("/", controller.getBranding);

router.put(
  "/",
  auth,
  rbac(["tenant_admin"]),
  controller.updateBranding
);

module.exports = router;