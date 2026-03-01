const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');

exports.register = async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);

  const user = await db.sequelize.models.users.create({
    ...req.body,
    password: hashed
  });

  res.json(user);
};

exports.login = async (req, res) => {
  const user = await db.sequelize.models.users.findOne({
    where: { email: req.body.email }
  });

  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, refreshToken });
};