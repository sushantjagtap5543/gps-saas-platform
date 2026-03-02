const bcrypt        = require("bcrypt");
const jwt           = require("jsonwebtoken");
const { generateTokens } = require("../security/jwt.service");
const db            = require("../models");
const logger        = require("../utils/logger");

async function auditLog(userId, action, ip, meta = {}) {
  try {
    await db.AuditLog.create({ user_id: userId, action, ip_address: ip, meta });
  } catch {}
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password required" });
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Invalid email format" });
    if (await db.User.findOne({ where: { email } }))
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 12);
    const user   = await db.User.create({ name, email, phone, password: hashed, role: "CLIENT" });
    await auditLog(user.id, "USER_REGISTER", req.ip, { email });

    logger.info("[AUTH] Registered: " + email);
    return res.status(201).json({
      message: "Registered successfully",
      user:    { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    logger.error("[AUTH] register: " + err.message);
    return res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user  = await db.User.findOne({ where: { email } });
    const dummy = "$2b$12$invalidhashfortimingsafety000000000000000000000000000";
    const valid = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummy);

    await db.AuditLog.create({
      user_id:    user ? user.id : null,
      action:     valid && user?.is_active ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
      ip_address: req.ip,
      meta:       { email }
    }).catch(() => {});

    if (!user || !valid)
      return res.status(401).json({ message: "Invalid credentials" });
    if (!user.is_active)
      return res.status(403).json({ message: "Account suspended. Contact support." });

    await user.update({ last_login: new Date(), login_count: (user.login_count || 0) + 1 });

    const { accessToken, refreshToken } = generateTokens(user);
    logger.info("[AUTH] Login: " + email + " role=" + user.role);
    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
    });
  } catch (err) {
    logger.error("[AUTH] login: " + err.message);
    return res.status(500).json({ message: "Login failed" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Refresh token required" });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await db.User.findByPk(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ message: "Unauthorized" });
    return res.json(generateTokens(user));
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ["password", "otp_secret"] },
      include: [
        { model: db.Subscription, as: "subscriptions", include: [{ model: db.Plan, as: "plan" }], limit: 1, order: [["createdAt","DESC"]] },
        { model: db.Branding, as: "branding" }
      ]
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    logger.error("[AUTH] me: " + err.message);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, city, state, country, timezone, language } = req.body;
    const user = await db.User.findByPk(req.user.id);
    await user.update({ name, phone, address, city, state, country, timezone, language });
    await auditLog(req.user.id, "PROFILE_UPDATE", req.ip);
    return res.json({ message: "Profile updated", user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    logger.error("[AUTH] updateProfile: " + err.message);
    return res.status(500).json({ message: "Update failed" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });
    if (newPassword.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    const user = await db.User.findByPk(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ message: "Current password incorrect" });
    await user.update({ password: await bcrypt.hash(newPassword, 12) });
    await auditLog(req.user.id, "PASSWORD_CHANGE", req.ip);
    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    logger.error("[AUTH] changePassword: " + err.message);
    return res.status(500).json({ message: "Failed to change password" });
  }
};

// ── Self-registration (QR code flow) ──────────────────────────
exports.selfRegister = async (req, res) => {
  try {
    const { imei, name, email, password, phone, company, vehicle_number, vehicle_type } = req.body;
    if (!imei || !name || !email || !password || !vehicle_number)
      return res.status(400).json({ message: "IMEI, name, email, password and vehicle number required" });

    if (!/^\d{15}$/.test(imei))
      return res.status(400).json({ message: "IMEI must be exactly 15 digits" });

    if (await db.User.findOne({ where: { email } }))
      return res.status(409).json({ message: "Email already registered" });

    if (await db.Device.findOne({ where: { imei } }))
      return res.status(409).json({ message: "This IMEI is already registered" });

    const bcryptjs = require("bcryptjs");
    const hash = await bcryptjs.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const user = await db.User.create({
      name, email, password: hash, phone,
      company_name: company,
      role: "CLIENT",
      is_active: true,
    });

    await db.Device.create({
      tenant_id:      user.id,
      imei,
      vehicle_number,
      vehicle_type:   vehicle_type || "CAR",
      status:         "INACTIVE",
      activation_code: Math.random().toString(36).substring(2,10).toUpperCase()
    });

    await db.AuditLog.create({
      user_id: user.id, action: "SELF_REGISTER", entity: "User",
      entity_id: user.id, ip_address: req.ip,
      new_value: { email, imei, vehicle_number }
    }).catch(()=>{});

    return res.status(201).json({ message: "Account created successfully! Please login." });
  } catch (err) {
    logger.error("[AUTH] selfRegister: " + err.message);
    return res.status(500).json({ message: "Registration failed: " + err.message });
  }
};
