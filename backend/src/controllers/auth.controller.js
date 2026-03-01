const bcrypt = require("bcrypt");
const { generateTokens } = require("../security/jwt.service");
const db = require("../models");
const logger = require("../utils/logger");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    if (await db.User.findOne({ where: { email } })) return res.status(409).json({ message: "Email already registered" });
    const hashed = await bcrypt.hash(password, 12);
    const user = await db.User.create({ name, email, password: hashed, role: "CLIENT" });
    logger.info("[AUTH] New user registered: " + email);
    return res.status(201).json({ message: "Registered successfully", user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    logger.error("[AUTH] register: " + err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    const user = await db.User.findOne({ where: { email, is_active: true } });
    const dummy = "$2b$12$invalidhashfortimingsafety000000000000000000000000000";
    const valid = user ? await bcrypt.compare(password, user.password) : await bcrypt.compare(password, dummy);
    if (!user || !valid) return res.status(401).json({ message: "Invalid credentials" });
    const { accessToken, refreshToken } = generateTokens(user);
    logger.info("[AUTH] Login: " + email);
    return res.json({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    logger.error("[AUTH] login: " + err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Refresh token required" });
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await db.User.findByPk(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ message: "Unauthorized" });
    return res.json(generateTokens(user));
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, { attributes: { exclude: ["password"] }, include: [{ model: db.Subscription, include: [db.Plan] }] });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
