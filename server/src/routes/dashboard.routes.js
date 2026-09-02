const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { getSummary } = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/dashboard/summary", authenticate, getSummary);

module.exports = router;
