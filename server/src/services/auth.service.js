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

// Records a token's jti as revoked (see auth.middleware.js's isTokenRevoked
// check) and opportunistically prunes rows for tokens that would have
// expired on their own by now, since revoked_tokens only needs to remember a
// jti for as long as the token itself would still be valid.
async function revokeToken(jti, expiresAt) {
  await pool.query("DELETE FROM revoked_tokens WHERE expires_at < NOW()");
  await pool.query(
    "INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING",
    [jti, expiresAt]
  );
}

async function isTokenRevoked(jti) {
  if (!jti) {
    return false;
  }
  const result = await pool.query("SELECT 1 FROM revoked_tokens WHERE jti = $1", [jti]);
  return result.rowCount > 0;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  revokeToken,
  isTokenRevoked,
};
