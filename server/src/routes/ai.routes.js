const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { pingAI } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/ai/ping", authenticate, pingAI);

module.exports = router;
