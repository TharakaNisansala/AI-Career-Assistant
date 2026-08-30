const { checkDatabaseConnection } = require("../services/health.service");

function getApiHealth(req, res) {
  res.json({
    status: "success",
    message: "AI Career Assistant API is running",
  });
}

async function getDatabaseHealth(req, res) {
  try {
    const serverTime = await checkDatabaseConnection();
    res.json({
      status: "success",
      message: "Database connection is healthy",
      serverTime,
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(503).json({
      status: "error",
      message: "Database connection is unavailable",
    });
  }
}

module.exports = { getApiHealth, getDatabaseHealth };
