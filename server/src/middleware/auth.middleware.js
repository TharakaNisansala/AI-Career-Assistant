const jwt = require("jsonwebtoken");
const { isTokenRevoked } = require("../services/auth.service");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ status: "error", message: "Authentication token is required" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (await isTokenRevoked(decoded.jti)) {
      return res.status(401).json({ status: "error", message: "Invalid or expired token" });
    }

    req.user = { userId: decoded.userId, email: decoded.email, jti: decoded.jti, exp: decoded.exp };
    next();
  } catch (error) {
    res.status(401).json({ status: "error", message: "Invalid or expired token" });
  }
}

module.exports = authenticate;
