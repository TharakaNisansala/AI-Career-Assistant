const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ status: "error", message: "Authentication token is required" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    res.status(401).json({ status: "error", message: "Invalid or expired token" });
  }
}

module.exports = authenticate;
