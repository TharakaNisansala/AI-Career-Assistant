const pool = require("../config/database");
const storage = require("./storage");
const { generateSafeFileName } = require("../utils/file.utils");

async function createResume({ userId, file }) {
  const safeFileName = generateSafeFileName(file.originalname);
  const storageKey = `${userId}/${safeFileName}`;
  await storage.saveFile(file.buffer, storageKey, { contentType: file.mimetype });

  try {
    const result = await pool.query(
      `INSERT INTO resumes (user_id, file_name, original_file_name, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING resume_id, original_file_name, file_size, mime_type, uploaded_at`,
      [userId, safeFileName, file.originalname, storageKey, file.size, file.mimetype]
    );
    return result.rows[0];
  } catch (error) {
    await storage.deleteFile(storageKey);
    throw error;
  }
}

async function listResumesForUser(userId, { limit, offset } = {}) {
  const result = await pool.query(
    `SELECT resume_id, original_file_name, file_size, mime_type, uploaded_at,
            COUNT(*) OVER() AS total_count
     FROM resumes
     WHERE user_id = $1
     ORDER BY uploaded_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const totalItems = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows.map(({ total_count, ...row }) => row), totalItems };
}

async function findResumeById(resumeId) {
  const result = await pool.query(
    `SELECT resume_id, user_id, file_name, original_file_name, file_path, file_size, mime_type, uploaded_at
     FROM resumes
     WHERE resume_id = $1`,
    [resumeId]
  );
  return result.rows[0] || null;
}

async function deleteResumeById(resumeId) {
  const result = await pool.query(
    "DELETE FROM resumes WHERE resume_id = $1 RETURNING file_path",
    [resumeId]
  );
  const deleted = result.rows[0];
  if (!deleted) {
    return null;
  }

  await storage.deleteFile(deleted.file_path);
  return deleted;
}

module.exports = {
  createResume,
  listResumesForUser,
  findResumeById,
  deleteResumeById,
};
