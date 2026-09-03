require("dotenv").config();
const dns = require("dns");
const { promisify } = require("util");
const { Client } = require("pg");

const lookup = promisify(dns.lookup);

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const host = url.hostname;
  const port = Number(url.port);
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const database = url.pathname.replace(/^\//, "");

  const resolved = await lookup(host, { family: 4 });
  console.log(`[debug] resolved ${host} -> ${resolved.address} (IPv${resolved.family})`);

  const client = new Client({
    host: resolved.address,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false, servername: host },
    connectionTimeoutMillis: 10000,
  });

  console.log(`[debug] connecting to ${resolved.address}:${port} as ${user} (forced IPv4)`);

  await client.connect();
  const res = await client.query("SELECT NOW()");
  console.log("SUCCESS:", res.rows);
  await client.end();
}

main().catch((err) => {
  console.error("FULL ERROR:", err);
  process.exit(1);
});
