const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to server/.env before starting the server."
  );
}

// Supabase's pooler (Supavisor/PgBouncer) presents a certificate chain that
// isn't in Node's default trust store (verified against this project's own
// pooler host: rejectUnauthorized: true fails with "self-signed certificate
// in certificate chain"). Pinning Supabase's actual CA certificate would let
// this be tightened to rejectUnauthorized: true; without it, disabling
// verification is required for the app to connect at all.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000,
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (error) => {
  console.error("Unexpected database error on idle client:", error.message);
});

module.exports = pool;