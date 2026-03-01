const db = require('../models');

exports.getAll = async (req, res) => {
  const devices = await db.Device.findAll();
  res.json(devices);
};

exports.create = async (req, res) => {
  const device = await db.Device.create(req.body);
  res.json(device);
};