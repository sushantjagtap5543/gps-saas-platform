const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date()
  });
});

module.exports = router;