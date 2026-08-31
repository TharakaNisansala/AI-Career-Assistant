const pool = require("../config/database");

async function createJobDescription({ userId, title, description }) {
  const result = await pool.query(
    `INSERT INTO job_descriptions (user_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING job_id, user_id, title, description, created_at`,
    [userId, title, description]
  );
  return result.rows[0];
}

async function listJobDescriptionsForUser(userId) {
  const result = await pool.query(
    `SELECT job_id, title, description, created_at
     FROM job_descriptions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findJobDescriptionById(jobId) {
  const result = await pool.query(
    `SELECT job_id, user_id, title, description, created_at
     FROM job_descriptions
     WHERE job_id = $1`,
    [jobId]
  );
  return result.rows[0] || null;
}

module.exports = { createJobDescription, listJobDescriptionsForUser, findJobDescriptionById };
