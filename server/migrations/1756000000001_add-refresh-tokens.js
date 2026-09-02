/* eslint-disable camelcase */

// Backs the refresh-token flow in auth.service.js/auth.controller.js. Only
// the SHA-256 hash of each refresh token is stored (never the raw token,
// which only ever exists in the httpOnly cookie), so a leaked database
// backup doesn't hand out valid refresh tokens the way a leaked
// revoked_tokens-style jti list would for access tokens.
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS refresh_tokens;`);
};
