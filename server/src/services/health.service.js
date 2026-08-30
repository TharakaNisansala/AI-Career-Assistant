const pool = require("../config/database");

async function checkDatabaseConnection() {
  const result = await pool.query("SELECT NOW() AS current_time");
  return result.rows[0].current_time;
}

module.exports = { checkDatabaseConnection };
