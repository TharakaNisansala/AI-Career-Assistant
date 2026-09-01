const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const express = require("express");
const pool = require("../config/database");
const authRoutes = require("./auth.routes");
const jobDescriptionRoutes = require("./jobDescription.routes");

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", authRoutes);
  app.use("/api/v1", jobDescriptionRoutes);
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

test("POST /job-descriptions stores a job description for the authenticated user", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed job description tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const suffix = crypto.randomBytes(4).toString("hex");
    const token = await registerAndLogin(baseUrl, `jobdesc-${suffix}@example.com`, "Password123");

    const response = await fetch(`${baseUrl}/api/v1/job-descriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: "Backend Engineer",
        description: "We are looking for a backend engineer with strong Node.js and PostgreSQL experience.",
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.status, "success");
    assert.ok(body.jobDescription.jobId);
    assert.equal(body.jobDescription.title, "Backend Engineer");

    const listResponse = await fetch(`${baseUrl}/api/v1/job-descriptions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody = await listResponse.json();
    assert.equal(listBody.jobDescriptions.length, 1);
  });
});

test("POST /job-descriptions rejects an empty job description", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed job description tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const suffix = crypto.randomBytes(4).toString("hex");
    const token = await registerAndLogin(baseUrl, `jobdescempty-${suffix}@example.com`, "Password123");

    const response = await fetch(`${baseUrl}/api/v1/job-descriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: "Backend Engineer", description: "" }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.status, "error");
  });
});

test("POST /job-descriptions without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/job-descriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Backend Engineer", description: "A valid description of the role." }),
    });
    assert.equal(response.status, 401);
  });
});

test("GET /job-descriptions only returns job descriptions owned by the caller", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed job description tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const suffixA = crypto.randomBytes(4).toString("hex");
    const suffixB = crypto.randomBytes(4).toString("hex");
    const tokenA = await registerAndLogin(baseUrl, `owner-a-${suffixA}@example.com`, "Password123");
    const tokenB = await registerAndLogin(baseUrl, `owner-b-${suffixB}@example.com`, "Password123");

    await fetch(`${baseUrl}/api/v1/job-descriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ title: "Owner A Role", description: "A role description that is long enough." }),
    });

    const listResponse = await fetch(`${baseUrl}/api/v1/job-descriptions`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const listBody = await listResponse.json();
    assert.deepEqual(listBody.jobDescriptions, []);
  });
});
