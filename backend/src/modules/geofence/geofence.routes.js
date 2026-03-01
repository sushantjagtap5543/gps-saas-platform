const router = require("express").Router();
const auth = require("../../middleware/auth.middleware");
const db   = require("../../models");

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const fences = await db.GeoFence.findAll({ where: { tenant_id: req.user.id } });
    res.json(fences);
  } catch { res.status(500).json({ message: "Failed to fetch geofences" }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, center_lat, center_lng, radius, polygon } = req.body;
    if (!name || !type) return res.status(400).json({ message: "name and type required" });
    const fence = await db.GeoFence.create({ tenant_id: req.user.id, name, type, center_lat, center_lng, radius, polygon });
    res.status(201).json(fence);
  } catch { res.status(500).json({ message: "Failed to create geofence" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await db.GeoFence.destroy({ where: { id: req.params.id, tenant_id: req.user.id } });
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch { res.status(500).json({ message: "Failed to delete geofence" }); }
});

module.exports = router;
