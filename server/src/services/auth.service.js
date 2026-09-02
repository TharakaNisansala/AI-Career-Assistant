const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/database");

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_BYTES = 48;

function hashRefreshToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

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

// Only the SHA-256 hash of the raw token is ever persisted -- the raw value
// lives solely in the httpOnly cookie handed to the client -- so a leaked
// database backup can't be replayed as a valid refresh token.
async function createRefreshToken(userId, expiresAt) {
  const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hashRefreshToken(rawToken), expiresAt]
  );
  return rawToken;
}

async function findValidRefreshToken(rawToken) {
  const result = await pool.query(
    `SELECT token_id, user_id, expires_at
     FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [hashRefreshToken(rawToken)]
  );
  return result.rows[0] || null;
}

async function revokeRefreshTokenById(tokenId) {
  await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_id = $1", [tokenId]);
}

async function revokeRefreshTokenByRawToken(rawToken) {
  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
    [hashRefreshToken(rawToken)]
  );
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  revokeToken,
  isTokenRevoked,
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshTokenById,
  revokeRefreshTokenByRawToken,
};
