const express = require("express");
const { register, login, logout, getCurrentUser } = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth.middleware");
const { authRateLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/auth/register", authRateLimiter, register);
router.post("/auth/login", authRateLimiter, login);
router.post("/auth/logout", authenticate, logout);
router.get("/auth/me", authenticate, getCurrentUser);

module.exports = router;
