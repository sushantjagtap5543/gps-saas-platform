const db = require("../models");
const logger = require("../utils/logger");

exports.getAll = async (req, res) => {
  try {
    const where = req.user.role === "ADMIN" ? {} : { tenant_id: req.user.id };
    const devices = await db.Device.findAll({ where, include: [{ model: db.GpsLive, required: false }], order: [["createdAt","DESC"]] });
    return res.json(devices);
  } catch (err) { return res.status(500).json({ message: "Failed to fetch devices" }); }
};

exports.getOne = async (req, res) => {
  try {
    const where = { id: req.params.id, ...(req.user.role !== "ADMIN" && { tenant_id: req.user.id }) };
    const device = await db.Device.findOne({ where, include: [db.GpsLive] });
    if (!device) return res.status(404).json({ message: "Device not found" });
    return res.json(device);
  } catch (err) { return res.status(500).json({ message: "Failed to fetch device" }); }
};

exports.create = async (req, res) => {
  try {
    const { imei, vehicle_number, model, sim_number } = req.body;
    if (!imei || !vehicle_number) return res.status(400).json({ message: "IMEI and vehicle number required" });
    const device = await db.Device.create({ imei, vehicle_number, model, sim_number, tenant_id: req.user.id });
    logger.info("[DEVICE] Created: " + imei);
    return res.status(201).json(device);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "IMEI already registered" });
    return res.status(500).json({ message: "Failed to create device" });
  }
};

exports.update = async (req, res) => {
  try {
    const device = await db.Device.findOne({ where: { id: req.params.id, tenant_id: req.user.id } });
    if (!device) return res.status(404).json({ message: "Device not found" });
    await device.update(req.body);
    return res.json(device);
  } catch (err) { return res.status(500).json({ message: "Failed to update device" }); }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await db.Device.destroy({ where: { id: req.params.id, tenant_id: req.user.id } });
    if (!deleted) return res.status(404).json({ message: "Device not found" });
    return res.json({ message: "Device deleted" });
  } catch (err) { return res.status(500).json({ message: "Failed to delete device" }); }
};

exports.getHistory = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { device_id: req.params.id };
    if (from) where.createdAt = { ...(where.createdAt || {}), [require("sequelize").Op.gte]: new Date(from) };
    if (to)   where.createdAt = { ...(where.createdAt || {}), [require("sequelize").Op.lte]: new Date(to) };
    const history = await db.GpsHistory.findAll({ where, order: [["createdAt","ASC"]], limit: 5000 });
    return res.json(history);
  } catch (err) { return res.status(500).json({ message: "Failed to fetch history" }); }
};
