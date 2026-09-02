const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to server/.env before starting the server."
  );
}

// Supabase signs its Postgres host certificate with its own root CA, which
// isn't in Node's default trust store, so plain rejectUnauthorized: true
// fails with "self-signed certificate in certificate chain". Pinning that
// root CA (fetched once via `openssl s_client -showcerts`, self-signed,
// subject == issuer == "Supabase Root 2021 CA") lets Node verify the real
// chain instead of disabling verification outright.
const supabaseCa = fs.readFileSync(
  path.join(__dirname, "certs", "supabase-root-ca.pem")
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: supabaseCa,
    rejectUnauthorized: true,
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