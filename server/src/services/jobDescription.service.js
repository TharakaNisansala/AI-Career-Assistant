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

async function listJobDescriptionsForUser(userId, { limit, offset } = {}) {
  const result = await pool.query(
    `SELECT job_id, title, description, created_at,
            COUNT(*) OVER() AS total_count
     FROM job_descriptions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const totalItems = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows.map(({ total_count, ...row }) => row), totalItems };
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
