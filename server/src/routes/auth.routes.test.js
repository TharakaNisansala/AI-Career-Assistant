const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const express = require("express");
const pool = require("../config/database");
const authRoutes = require("./auth.routes");

// Covers the auth flows that aren't exercised elsewhere: registration
// enumeration (an existing email must respond identically to a new one) and
// logout actually revoking the token server-side, rather than just clearing
// client-side storage. Needs a real database (skipped when unreachable, same
// pattern as the other routes.test.js files).
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", authRoutes);
  return app;
}

async function withServer(run) {
  const app = buildTestApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function isDatabaseReachable() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

async function registerAndLogin(baseUrl, email, password) {
  await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email, password }),
  });
  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await loginResponse.json();
  return body.token;
}

test("POST /auth/register responds identically for a new email and an already-registered one", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed auth tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const email = `enum-${crypto.randomBytes(4).toString("hex")}@example.com`;
    const payload = { name: "Test User", email, password: "Password123" };

    const firstResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const firstBody = await firstResponse.json();

    const secondResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const secondBody = await secondResponse.json();

    assert.equal(firstResponse.status, secondResponse.status);
    assert.deepEqual(firstBody, secondBody);

    // The real user's own credentials still work either way.
    const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123" }),
    });
    assert.equal(loginResponse.status, 200);
  });
});

test("POST /auth/logout revokes the token so it can no longer authenticate", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed auth tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const email = `logout-${crypto.randomBytes(4).toString("hex")}@example.com`;
    const token = await registerAndLogin(baseUrl, email, "Password123");

    const beforeLogout = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(beforeLogout.status, 200);

    const logoutResponse = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logoutResponse.status, 200);

    const afterLogout = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(afterLogout.status, 401);
  });
});
