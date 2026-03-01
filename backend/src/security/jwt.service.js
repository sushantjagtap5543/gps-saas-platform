const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");

exports.generateTokens = (user) => {

  const accessToken = jwt.sign(
    { id: user.id, role: user.role, tenant_id: user.tenant_id },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenId: uuid() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};