const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const resumeRoutes = require("./resume.routes");

// These cover unauthorized access only: the authenticate middleware rejects
// the request before the resume controller/service/database is ever reached,
// so this suite needs no database connection.
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", resumeRoutes);
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

test("POST /resumes/upload without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/resumes/upload`, {
      method: "POST",
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.status, "error");
  });
});

test("GET /resumes without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/resumes`);
    assert.equal(response.status, 401);
  });
});

test("GET /resumes/:resumeId/text without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/v1/resumes/3fa85f64-5717-4562-b3fc-2c963f66afa6/text`
    );
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.status, "error");
  });
});

test("DELETE /resumes/:resumeId without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/v1/resumes/3fa85f64-5717-4562-b3fc-2c963f66afa6`,
      { method: "DELETE" }
    );
    assert.equal(response.status, 401);
  });
});

test("GET /resumes with a malformed token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/resumes`, {
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.status, "error");
  });
});

