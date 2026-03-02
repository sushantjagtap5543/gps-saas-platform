const router = require("express").Router();
const { authenticate: auth } = require("../../middleware/auth.middleware");
const rbac   = require("../../middleware/rbac.middleware");
const svc    = require("./branding.service");

router.get("/", async (req, res) => {
  try { res.json(await svc.getBrandingByDomain(req.headers.host) || {}); }
  catch { res.status(500).json({ message: "Failed to fetch branding" }); }
});

router.put("/", auth, rbac(["ADMIN","CLIENT"]), async (req, res) => {
  try { res.json(await svc.updateBranding(req.user.id, req.body)); }
  catch { res.status(500).json({ message: "Failed to update branding" }); }
});

module.exports = router;
