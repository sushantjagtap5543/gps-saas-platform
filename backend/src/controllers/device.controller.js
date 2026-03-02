const db     = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

const getTenantFilter = (user) => {
  if (["SUPER_ADMIN","ADMIN"].includes(user.role)) return {};
  if (user.role === "RESELLER") return { reseller_id: user.id };
  return { tenant_id: user.id };
};

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, vehicle_type, search } = req.query;
    const where = getTenantFilter(req.user);
    if (status) where.status = status;
    if (vehicle_type) where.vehicle_type = vehicle_type;
    if (search) where[Op.or] = [
      { imei: { [Op.iLike]: `%${search}%` } },
      { vehicle_number: { [Op.iLike]: `%${search}%` } }
    ];

    const { count, rows } = await db.Device.findAndCountAll({
      where,
      include: [
        { model: db.GpsLive, as: "liveData" },
        { model: db.DeviceModel, as: "model", attributes: ["name","brand","protocol"] }
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [["createdAt","DESC"]]
    });
    return res.json({ total: count, page: parseInt(page), devices: rows });
  } catch (err) {
    logger.error("[DEVICE] list: " + err.message);
    return res.status(500).json({ message: "Failed to list devices" });
  }
};

exports.getOne = async (req, res) => {
  try {
    const device = await db.Device.findOne({
      where: { id: req.params.id, ...getTenantFilter(req.user) },
      include: [
        { model: db.GpsLive, as: "liveData" },
        { model: db.DeviceModel, as: "model" },
        { model: db.User, as: "tenant", attributes: ["id","name","email"] }
      ]
    });
    if (!device) return res.status(404).json({ message: "Device not found" });
    return res.json(device);
  } catch (err) {
    return res.status(500).json({ message: "Failed" });
  }
};

exports.create = async (req, res) => {
  try {
    const { imei, vehicle_number, vehicle_type, model_id, notes } = req.body;
    if (!imei || !vehicle_number) return res.status(400).json({ message: "IMEI and vehicle number required" });
    if (!/^\d{15}$/.test(imei)) return res.status(400).json({ message: "IMEI must be 15 digits" });
    if (await db.Device.findOne({ where: { imei } }))
      return res.status(409).json({ message: "IMEI already registered" });

    const tenant_id = req.body.tenant_id || req.user.id;
    const device = await db.Device.create({
      tenant_id, imei, vehicle_number, vehicle_type, model_id, notes,
      activation_code: Math.random().toString(36).substring(2, 10).toUpperCase()
    });
    await db.AuditLog.create({ user_id: req.user.id, action: "DEVICE_CREATE", entity: "Device", entity_id: device.id, ip_address: req.ip, new_value: { imei } });
    return res.status(201).json(device);
  } catch (err) {
    logger.error("[DEVICE] create: " + err.message);
    return res.status(500).json({ message: "Failed to create device" });
  }
};

exports.update = async (req, res) => {
  try {
    const device = await db.Device.findOne({
      where: { id: req.params.id, ...getTenantFilter(req.user) }
    });
    if (!device) return res.status(404).json({ message: "Not found" });
    const allowed = ["vehicle_number","vehicle_type","model_id","driver_id","notes","sim_id"];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await device.update(updates);
    await db.AuditLog.create({ user_id: req.user.id, action: "DEVICE_UPDATE", entity: "Device", entity_id: device.id, ip_address: req.ip, new_value: updates });
    return res.json(device);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update" });
  }
};

exports.delete = async (req, res) => {
  try {
    const device = await db.Device.findOne({ where: { id: req.params.id, ...getTenantFilter(req.user) } });
    if (!device) return res.status(404).json({ message: "Not found" });
    await device.destroy();
    await db.AuditLog.create({ user_id: req.user.id, action: "DEVICE_DELETE", entity: "Device", entity_id: device.id, ip_address: req.ip, new_value: { imei: device.imei } });
    return res.json({ message: "Device deleted" });
  } catch { return res.status(500).json({ message: "Failed" }); }
};

exports.getHistory = async (req, res) => {
  try {
    const { from, to, limit = 500 } = req.query;
    const device = await db.Device.findOne({ where: { id: req.params.id, ...getTenantFilter(req.user) } });
    if (!device) return res.status(404).json({ message: "Not found" });

    const where = { device_id: device.id };
    if (from) where.createdAt = { ...(where.createdAt || {}), [Op.gte]: new Date(from) };
    if (to)   where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(to) };

    const history = await db.GpsHistory.findAll({
      where,
      order: [["createdAt","ASC"]],
      limit: parseInt(limit)
    });
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch history" });
  }
};

exports.getTrips = async (req, res) => {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const device = await db.Device.findOne({ where: { id: req.params.id, ...getTenantFilter(req.user) } });
    if (!device) return res.status(404).json({ message: "Not found" });

    const where = { device_id: device.id };
    if (from) where.start_time = { [Op.gte]: new Date(from) };
    if (to)   where.start_time = { ...(where.start_time || {}), [Op.lte]: new Date(to) };

    const { count, rows } = await db.Trip.findAndCountAll({
      where,
      order: [["start_time","DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    return res.json({ total: count, trips: rows });
  } catch { return res.status(500).json({ message: "Failed" }); }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const device = await db.Device.findOne({ where: { id: req.params.id, ...getTenantFilter(req.user) } });
    if (!device) return res.status(404).json({ message: "Not found" });

    const analytics = await db.Analytics.findAll({
      where: {
        device_id: device.id,
        date: { [Op.gte]: new Date(Date.now() - parseInt(days) * 86400000) }
      },
      order: [["date","ASC"]]
    });
    return res.json(analytics);
  } catch { return res.status(500).json({ message: "Failed" }); }
};

exports.getModels = async (req, res) => {
  try {
    const models = await db.DeviceModel.findAll({ where: { is_active: true } });
    return res.json(models);
  } catch { return res.status(500).json({ message: "Failed" }); }
};

// ── SIMULATE GPS DATA (for testing without real hardware) ──────
exports.simulate = async (req, res) => {
  try {
    const { imei, latitude, longitude, speed = 0, heading = 0, altitude = 0,
            satellites = 8, ignition = true, battery_voltage = 12.4,
            gsm_signal = 85, alarm } = req.body;

    if (!imei) return res.status(400).json({ message: "IMEI required" });

    // Find device
    const device = await db.Device.findOne({ where: { imei } });
    if (!device) return res.status(404).json({ message: `Device IMEI ${imei} not registered. Add it in Devices first.` });

    const now = new Date();

    // Update or create live location
    await db.GpsLive.upsert({
      device_id:       device.id,
      latitude:        parseFloat(latitude) || 0,
      longitude:       parseFloat(longitude) || 0,
      altitude:        parseFloat(altitude) || 0,
      speed:           parseFloat(speed) || 0,
      heading:         parseFloat(heading) || 0,
      satellites:      parseInt(satellites) || 0,
      ignition:        Boolean(ignition),
      battery_voltage: parseFloat(battery_voltage) || 0,
      gsm_signal:      parseInt(gsm_signal) || 0,
      io_status:       { alarm: alarm || null },
      updatedAt:       now
    }, { fields: ["latitude","longitude","altitude","speed","heading","satellites","ignition","battery_voltage","gsm_signal","io_status","updatedAt"] });

    // Insert into history
    if (latitude && longitude) {
      await db.GpsHistory.create({
        device_id: device.id,
        latitude:  parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed:     parseFloat(speed) || 0,
        heading:   parseFloat(heading) || 0,
        altitude:  parseFloat(altitude) || 0,
        satellites: parseInt(satellites) || 0,
        ignition:  Boolean(ignition),
        battery_voltage: parseFloat(battery_voltage) || 0,
        gsm_signal: parseInt(gsm_signal) || 0
      });
    }

    // Update device status to ONLINE
    await device.update({ status: "ONLINE", last_seen: now });

    // Create alarm alert if present
    if (alarm) {
      const alarmMessages = { SOS: "SOS alarm triggered", power_cut: "Power cut detected", vibration: "Vehicle tamper/vibration", low_battery: "Low battery alert" };
      const devFull = await db.Device.findOne({ where: { id: device.id } });
      await db.AlertEvent.create({
        device_id:  device.id,
        tenant_id:  device.tenant_id || device.id,
        severity:   alarm === "SOS" ? "CRITICAL" : "WARNING",
        message:    alarmMessages[alarm] || `Alarm: ${alarm}`,
        type: alarm,
        
        extra_data: { latitude, longitude, speed, source: "simulator" }
      }).catch(() => {});
    }

    // Emit via Socket.IO if available
    const io = req.app.get("io");
    if (io) {
      io.emit("gps_update", {
        device_id:  device.id,
        tenant_id:  device.tenant_id || device.id,
        imei:       device.imei,
        vehicle_number: device.vehicle_number,
        latitude:   parseFloat(latitude),
        longitude:  parseFloat(longitude),
        speed:      parseFloat(speed) || 0,
        heading:    parseFloat(heading) || 0,
        ignition:   Boolean(ignition),
        status:     "ONLINE",
        timestamp:  now
      });
    }

    return res.json({
      ok: true,
      device_id:     device.id,
      vehicle_number: device.vehicle_number,
      status:        "ONLINE",
      timestamp:     now
    });
  } catch (err) {
    console.error("[SIMULATE] Error:", err.message);
    return res.status(500).json({ message: "Simulation failed: " + err.message });
  }
};

// ── LIVE TRACKING - All devices with current position ─────────
exports.getLiveAll = async (req, res) => {
  try {
    const filter = {};
    if (!["SUPER_ADMIN","ADMIN"].includes(req.user.role)) {
      if (req.user.role === "RESELLER") filter.reseller_id = req.user.id;
      else filter.tenant_id = req.user.id;
    }
    const devices = await db.Device.findAll({
      where: { ...filter, status: { [Op.in]: ["ONLINE","OFFLINE","INACTIVE"] } },
      include: [
        { model: db.GpsLive, as: "liveData", required: false },
        { model: db.DeviceModel, as: "model", attributes: ["name","brand","protocol"], required: false }
      ],
      attributes: ["id","imei","vehicle_number","vehicle_type","status","last_seen"],
      order: [["status","ASC"]]
    });

    return res.json(devices.map(d => ({
      id:             d.id,
      imei:           d.imei,
      vehicle_number: d.vehicle_number,
      vehicle_type:   d.vehicle_type,
      status:         d.status,
      last_seen:      d.last_seen,
      model:          d.model?.name,
      latitude:       d.liveData?.latitude ?? null,
      longitude:      d.liveData?.longitude ?? null,
      speed:          d.liveData?.speed ?? 0,
      heading:        d.liveData?.heading ?? 0,
      ignition:       d.liveData?.ignition ?? false,
      altitude:       d.liveData?.altitude ?? 0,
      satellites:     d.liveData?.satellites ?? 0,
      battery_voltage: d.liveData?.battery_voltage ?? 0,
      gsm_signal:     d.liveData?.gsm_signal ?? 0,
    })));
  } catch (err) {
    logger.error("[DEVICE] getLiveAll: " + err.message);
    return res.status(500).json({ message: "Failed to fetch live data" });
  }
};

// ── QR Code for device registration ──────────────────────────
exports.getQRCode = async (req, res) => {
  try {
    const device = await db.Device.findOne({ where: { id: req.params.id, ...getTenantFilter(req.user) } });
    if (!device) return res.status(404).json({ message: "Device not found" });

    const baseUrl = process.env.FRONTEND_URL || `http://localhost:5025`;
    const regUrl  = `${baseUrl}/register?imei=${device.imei}`;

    // Return URL (frontend renders QR using qrcode.js library)
    return res.json({
      imei:         device.imei,
      register_url: regUrl,
      qr_data:      regUrl,
      vehicle_number: device.vehicle_number,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed" });
  }
};
