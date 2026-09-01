const express = require("express");
const { register, login, getCurrentUser } = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth.middleware");
const { authRateLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/auth/register", authRateLimiter, register);
router.post("/auth/login", authRateLimiter, login);
router.get("/auth/me", authenticate, getCurrentUser);

module.exports = router;
