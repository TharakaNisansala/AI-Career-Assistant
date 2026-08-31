const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const express = require("express");
const PDFDocument = require("pdfkit");
const pool = require("../config/database");
const authRoutes = require("./auth.routes");
const resumeRoutes = require("./resume.routes");

// Covers the parts of extraction that need a real database: authenticating
// as two different users and confirming the resume-ownership check. Format
// parsing itself (PDF/DOCX/empty/corrupted) is already covered without a
// database in textExtraction.utils.test.js and resumeExtraction.service.test.js.
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", authRoutes);
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

async function isDatabaseReachable() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

function buildPdfBuffer(text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.text(text);
    doc.end();
  });
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

async function uploadResume(baseUrl, token, buffer, filename, contentType) {
  const form = new FormData();
  form.append("resume", new Blob([buffer], { type: contentType }), filename);
  const response = await fetch(`${baseUrl}/api/v1/resumes/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return response.json();
}

test("GET /resumes/:resumeId/text extracts the owner's resume and rejects other users", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed extraction tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const suffix = crypto.randomBytes(4).toString("hex");
    const ownerToken = await registerAndLogin(
      baseUrl,
      `owner-${suffix}@example.com`,
      "password123"
    );
    const otherToken = await registerAndLogin(
      baseUrl,
      `other-${suffix}@example.com`,
      "password123"
    );

    const pdfBuffer = await buildPdfBuffer("Jane Doe - Senior Backend Engineer");
    const uploadBody = await uploadResume(
      baseUrl,
      ownerToken,
      pdfBuffer,
      "resume.pdf",
      "application/pdf"
    );
    assert.equal(uploadBody.status, "success");
    const { resumeId } = uploadBody.resume;

    try {
      const ownerResponse = await fetch(`${baseUrl}/api/v1/resumes/${resumeId}/text`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(ownerResponse.status, 200);
      const ownerBody = await ownerResponse.json();
      assert.match(ownerBody.text, /Jane Doe - Senior Backend Engineer/);

      const otherResponse = await fetch(`${baseUrl}/api/v1/resumes/${resumeId}/text`, {
        headers: { Authorization: `Bearer ${otherToken}` },
      });
      assert.equal(otherResponse.status, 404);
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
    }
  });
});
