const express = require("express");
const {
  getApiHealth,
  getDatabaseHealth,
} = require("../controllers/health.controller");

const router = express.Router();

router.get("/health", getApiHealth);
router.get("/health/db", getDatabaseHealth);

module.exports = router;
