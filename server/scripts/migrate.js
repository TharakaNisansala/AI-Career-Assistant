require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { runner } = require("node-pg-migrate");

const direction = process.argv[2] === "down" ? "down" : "up";

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is not set. Add it to server/.env before running migrations.");
}

// Reuses the same pinned Supabase root CA as src/config/database.js so
// migrations verify the DB's TLS certificate the same way the app does,
// instead of falling back to node-pg-migrate's default (unverified) ssl mode.
const ca = fs.readFileSync(
  path.join(__dirname, "..", "src", "config", "certs", "supabase-root-ca.pem")
);

runner({
  databaseUrl: {
    // Direct connection, not the pooler: PgBouncer's transaction pooling
    // mode doesn't reliably support the prepared statements / session-level
    // DDL that node-pg-migrate needs.
    connectionString: process.env.DIRECT_URL,
    ssl: { ca, rejectUnauthorized: true },
  },
  dir: path.join(__dirname, "..", "migrations"),
  direction,
  migrationsTable: "pgmigrations",
  count: direction === "down" ? 1 : Infinity,
})
  .then(() => {
    console.log(`Migration ${direction} complete`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Migration ${direction} failed:`, error);
    process.exit(1);
  });
