const bcrypt = require("bcryptjs");
const pool = require("../config/database");

const SALT_ROUNDS = 10;

async function findUserByEmail(email) {
  const result = await pool.query(
    "SELECT user_id, name, email, password, created_at FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] || null;
}

async function findUserById(userId) {
  const result = await pool.query(
    "SELECT user_id, name, email, created_at FROM users WHERE user_id = $1",
    [userId]
  );
  return result.rows[0] || null;
}

async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING user_id, name, email, created_at`,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
};
