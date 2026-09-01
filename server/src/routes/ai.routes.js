const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { aiRateLimiter } = require("../middleware/rateLimit.middleware");
const { pingAI } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/ai/ping", authenticate, aiRateLimiter, pingAI);

module.exports = router;
