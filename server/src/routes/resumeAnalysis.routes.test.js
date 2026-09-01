const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const pool = require("../config/database");
const authRoutes = require("./auth.routes");
const resumeRoutes = require("./resume.routes");
const resumeAnalysisRoutes = require("./resumeAnalysis.routes");

// Covers the full pipeline over HTTP: ownership checks, the deterministic
// scoring pipeline end to end against a fake AI provider, and AI/validation
// error mapping. Needs a real database for resumes/users/analyses (skipped
// when unreachable, same as resumeText.integration.test.js) but never a real
// AI provider -- the AI boundary is faked the same way ai.routes.test.js does.
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", authRoutes);
  app.use("/api/v1", resumeRoutes);
  app.use("/api/v1", resumeAnalysisRoutes);
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

async function withFakeAIProvider(respond, run) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => respond(req, res, body));
  });
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const original = {
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_API_BASE_URL: process.env.AI_API_BASE_URL,
  };
  // Pinned regardless of .env's AI_PROVIDER: the fake server below always
  // responds in Anthropic's response shape.
  process.env.AI_PROVIDER = "anthropic";
  process.env.AI_API_KEY = "test-key";
  process.env.AI_API_BASE_URL = `http://127.0.0.1:${port}`;

  try {
    await run();
  } finally {
    await new Promise((resolve) => server.close(resolve));
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function fakeAiJsonResponse(payload) {
  return (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        model: "claude-sonnet-5",
        content: [{ type: "text", text: JSON.stringify(payload) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      })
    );
  };
}

const VALID_AI_PAYLOAD = {
  summary: "Experienced backend engineer with a focus on distributed systems.",
  skills: [
    "Node.js", "JavaScript", "PostgreSQL", "Express", "Docker", "AWS",
    "REST APIs", "Git", "Automated Testing", "CI/CD", "System Design", "Microservices",
  ],
  education: [
    { degree: "Bachelor of Science in Computer Science", field: "Computer Science", institution: "State University", graduationYear: "2016" },
  ],
  experience: [
    { title: "Senior Backend Engineer", company: "Tech Corp", startDate: "2019-01", endDate: "Present", description: "Led backend development for a distributed platform." },
  ],
  strengths: ["Strong technical breadth across backend technologies"],
  weaknesses: ["Resume does not highlight leadership or mentoring experience"],
  recommendations: ["Add quantifiable achievements, such as performance improvements or team size led"],
};

async function setupOwnerWithResume(baseUrl, emailPrefix) {
  const suffix = crypto.randomBytes(4).toString("hex");
  const token = await registerAndLogin(baseUrl, `${emailPrefix}-${suffix}@example.com`, "Password123");
  const pdfBuffer = await buildPdfBuffer(
    "Jane Doe\nSenior Backend Engineer\njane@example.com | 555-123-4567\n\n" +
      "Summary\nExperienced backend engineer.\n\n" +
      "Experience\n- Senior Backend Engineer at Tech Corp (2019-Present)\n\n" +
      "Education\nBachelor of Science in Computer Science, State University, 2016\n\n" +
      "Skills\nNode.js, JavaScript, PostgreSQL"
  );
  const uploadBody = await uploadResume(baseUrl, token, pdfBuffer, "resume.pdf", "application/pdf");
  return { token, resumeId: uploadBody.resume.resumeId };
}

test("POST /analysis/resume/:resumeId analyzes a resume, scores it, and stores the result", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed analysis tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "owner");

    try {
      await withFakeAIProvider(fakeAiJsonResponse(VALID_AI_PAYLOAD), async () => {
        const response = await fetch(`${baseUrl}/api/v1/analysis/resume/${resumeId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(response.status, 201);
        const body = await response.json();
        assert.equal(body.status, "success");

        const { analysis } = body;
        assert.ok(analysis.atsScore >= 0 && analysis.atsScore <= 100);
        assert.ok(Array.isArray(analysis.scoreBreakdown));
        assert.equal(analysis.scoreBreakdown.length, 6);
        assert.equal(analysis.education.length, 1);
        assert.equal(analysis.experience.length, 1);
        assert.ok(analysis.strengths.length > 0);
        assert.ok(analysis.weaknesses.length > 0);
        assert.ok(analysis.recommendations.length > 0);
        assert.ok(analysis.skills.includes("Node.js"));
      });

      const historyResponse = await fetch(`${baseUrl}/api/v1/analysis/resume/${resumeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(historyResponse.status, 200);
      const historyBody = await historyResponse.json();
      assert.equal(historyBody.analyses.length, 1);
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /analysis/resume/:resumeId returns 404 for a resume that does not exist", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed analysis tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const suffix = crypto.randomBytes(4).toString("hex");
    const token = await registerAndLogin(baseUrl, `solo-${suffix}@example.com`, "Password123");
    const response = await fetch(`${baseUrl}/api/v1/analysis/resume/${crypto.randomUUID()}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 404);
  });
});

test("POST /analysis/resume/:resumeId returns 404 when the resume belongs to another user", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed analysis tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token: ownerToken, resumeId } = await setupOwnerWithResume(baseUrl, "owner2");
    const suffix = crypto.randomBytes(4).toString("hex");
    const otherToken = await registerAndLogin(baseUrl, `other-${suffix}@example.com`, "Password123");

    try {
      const response = await fetch(`${baseUrl}/api/v1/analysis/resume/${resumeId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${otherToken}` },
      });
      assert.equal(response.status, 404);
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
    }
  });
});

test("POST /analysis/resume/:resumeId returns 502 when the AI provider fails", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed analysis tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "aifail");

    try {
      await withFakeAIProvider(
        (req, res) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "internal provider failure" } }));
        },
        async () => {
          const response = await fetch(`${baseUrl}/api/v1/analysis/resume/${resumeId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          assert.equal(response.status, 502);
        }
      );
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /analysis/resume/:resumeId returns 502 when the AI response is malformed", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed analysis tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "malformed");

    try {
      await withFakeAIProvider(
        (req, res) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              model: "claude-sonnet-5",
              content: [{ type: "text", text: "Sure, here is my analysis of your resume in prose." }],
              usage: { input_tokens: 500, output_tokens: 50 },
            })
          );
        },
        async () => {
          const response = await fetch(`${baseUrl}/api/v1/analysis/resume/${resumeId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          assert.equal(response.status, 502);
          const body = await response.json();
          assert.equal(body.status, "error");
        }
      );
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /analysis/resume/:resumeId without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/analysis/resume/${crypto.randomUUID()}`, {
      method: "POST",
    });
    assert.equal(response.status, 401);
  });
});

test("POST /analysis/resume/:resumeId rejects an invalid resume id", async () => {
  await withServer(async (baseUrl) => {
    const token = jwt.sign(
      { userId: "test-user", email: "test@example.com" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    const response = await fetch(`${baseUrl}/api/v1/analysis/resume/not-a-uuid`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 400);
  });
});
