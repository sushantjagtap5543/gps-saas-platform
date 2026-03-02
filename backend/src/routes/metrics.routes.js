const router = require("express").Router();
const { client } = require("../monitoring/metrics");

router.get("/", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) { res.status(500).end(err.message); }
});

module.exports = router;
