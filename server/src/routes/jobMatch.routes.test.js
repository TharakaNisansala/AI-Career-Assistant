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
const jobDescriptionRoutes = require("./jobDescription.routes");
const jobMatchRoutes = require("./jobMatch.routes");

// Covers the full pipeline over HTTP: ownership checks on both the job
// description and the resume, the deterministic scoring pipeline end to end
// against a fake AI provider, and a high-match/low-match/missing-skills
// spread. Needs a real database (skipped when unreachable, same as
// resumeAnalysis.routes.test.js) but never a real AI provider.
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", authRoutes);
  app.use("/api/v1", resumeRoutes);
  app.use("/api/v1", jobDescriptionRoutes);
  app.use("/api/v1", jobMatchRoutes);
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

async function createJobDescription(baseUrl, token, title, description) {
  const response = await fetch(`${baseUrl}/api/v1/job-descriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, description }),
  });
  return response.json();
}

// Three AI calls happen per match: one for resume facts (resumeAnalysis
// prompt, containing "Resume text:"), one for job requirements (jobMatch
// prompt, containing "Job description:"), and -- only when the job
// description yields any required/preferred skills -- one for the holistic
// skill-fit evaluation (containing "holistic skill fit"). The fake server
// inspects the outgoing prompt to return the right canned payload for each.
async function withFakeAIProvider(resumeFactsPayload, jobRequirementsPayload, skillMatchPayload, run) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = {};
      }
      const userContent = parsed.messages?.[0]?.content || "";
      let payload;
      if (userContent.includes("Job description:")) {
        payload = jobRequirementsPayload;
      } else if (userContent.includes("holistic skill fit")) {
        payload = skillMatchPayload;
      } else {
        payload = resumeFactsPayload;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          model: "claude-sonnet-5",
          content: [{ type: "text", text: JSON.stringify(payload) }],
          usage: { input_tokens: 500, output_tokens: 300 },
        })
      );
    });
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

const STRONG_RESUME_FACTS = {
  summary: "Senior backend engineer with distributed systems experience.",
  skills: ["Node.js", "JavaScript", "PostgreSQL", "Express", "Docker", "AWS", "REST APIs", "Git"],
  education: [
    { degree: "Bachelor of Science in Computer Science", field: "Computer Science", institution: "State University", graduationYear: "2015" },
  ],
  experience: [
    { title: "Senior Backend Engineer", company: "Tech Corp", startDate: "2016-01", endDate: "Present", description: "Led backend development." },
  ],
  strengths: ["Strong technical breadth"],
  weaknesses: ["Limited leadership examples"],
  recommendations: ["Add quantifiable achievements"],
};

const WEAK_RESUME_FACTS = {
  summary: "Graphic designer specializing in branding and print media.",
  skills: ["Photoshop", "Illustrator", "InDesign"],
  education: [],
  experience: [],
  strengths: ["Strong visual design sense"],
  weaknesses: ["No backend engineering experience"],
  recommendations: ["Build a technical portfolio"],
};

const MATCHING_JOB_REQUIREMENTS = {
  requiredSkills: ["Node.js", "PostgreSQL", "Docker"],
  preferredSkills: ["AWS"],
  minExperienceYears: 5,
  educationRequirement: "Bachelor's degree in Computer Science",
  keywords: ["backend", "distributed"],
};

const STRONG_SKILL_MATCH = {
  skillMatchScore: 100,
  matchedSkills: ["Node.js", "PostgreSQL", "Docker", "AWS"],
  partiallyCoveredSkills: [],
  missingSkills: [],
  overallAssessment: "Direct, strong match on every required and preferred skill.",
};

const WEAK_SKILL_MATCH = {
  skillMatchScore: 0,
  matchedSkills: [],
  partiallyCoveredSkills: [],
  missingSkills: ["Node.js", "PostgreSQL", "Docker", "AWS"],
  overallAssessment: "No relevant backend skills or transferable experience found; candidate's background is in graphic design.",
};

async function setupOwnerWithResume(baseUrl, emailPrefix, resumeText) {
  const suffix = crypto.randomBytes(4).toString("hex");
  const token = await registerAndLogin(baseUrl, `${emailPrefix}-${suffix}@example.com`, "Password123");
  const pdfBuffer = await buildPdfBuffer(resumeText);
  const uploadBody = await uploadResume(baseUrl, token, pdfBuffer, "resume.pdf", "application/pdf");
  return { token, resumeId: uploadBody.resume.resumeId };
}

test("POST /job-match/:jobId/resume/:resumeId scores a strong candidate as a high match", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed job match tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(
      baseUrl,
      "strong",
      "Jane Doe\nSenior Backend Engineer\njane@example.com | 555-123-4567\n\nExperience\nSenior Backend Engineer, Tech Corp\n\nSkills\nNode.js, PostgreSQL, Docker, AWS"
    );
    const jobBody = await createJobDescription(
      baseUrl,
      token,
      "Backend Engineer",
      "We need a backend engineer skilled in Node.js, PostgreSQL, and Docker, with AWS experience preferred."
    );
    const jobId = jobBody.jobDescription.jobId;

    try {
      await withFakeAIProvider(STRONG_RESUME_FACTS, MATCHING_JOB_REQUIREMENTS, STRONG_SKILL_MATCH, async () => {
        const response = await fetch(`${baseUrl}/api/v1/job-match/${jobId}/resume/${resumeId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(response.status, 201);
        const body = await response.json();
        assert.equal(body.status, "success");

        const { match } = body;
        assert.ok(match.matchPercentage >= 70, `expected a high match percentage, got ${match.matchPercentage}`);
        assert.deepEqual(match.missingSkills, []);
        assert.ok(match.matchedSkills.includes("Node.js"));
        assert.ok(match.matchedSkills.includes("PostgreSQL"));
        assert.ok(match.matchedSkills.includes("Docker"));
        assert.ok(match.strengths.length > 0);
        assert.ok(Array.isArray(match.scoreBreakdown));
      });

      const historyResponse = await fetch(`${baseUrl}/api/v1/job-match/${jobId}/resume/${resumeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const historyBody = await historyResponse.json();
      assert.equal(historyBody.matches.length, 1);
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /job-match/:jobId/resume/:resumeId scores an unrelated candidate as a low match and lists missing skills", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed job match tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(
      baseUrl,
      "weak",
      "John Smith\nGraphic Designer\njohn@example.com | 555-987-6543\n\nExperience\nGraphic Designer\n\nSkills\nPhotoshop, Illustrator, InDesign"
    );
    const jobBody = await createJobDescription(
      baseUrl,
      token,
      "Backend Engineer",
      "We need a backend engineer skilled in Node.js, PostgreSQL, and Docker, with AWS experience preferred."
    );
    const jobId = jobBody.jobDescription.jobId;

    try {
      await withFakeAIProvider(WEAK_RESUME_FACTS, MATCHING_JOB_REQUIREMENTS, WEAK_SKILL_MATCH, async () => {
        const response = await fetch(`${baseUrl}/api/v1/job-match/${jobId}/resume/${resumeId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(response.status, 201);
        const body = await response.json();

        const { match } = body;
        assert.ok(match.matchPercentage < 30, `expected a low match percentage, got ${match.matchPercentage}`);
        assert.deepEqual(match.matchedSkills, []);
        assert.deepEqual(match.missingSkills, ["Node.js", "PostgreSQL", "Docker"]);
        assert.ok(match.recommendations.some((rec) => rec.includes("Node.js")));
      });
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /job-match/:jobId/resume/:resumeId returns 404 when the resume belongs to another user", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed job match tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token: ownerToken, resumeId } = await setupOwnerWithResume(
      baseUrl,
      "owner",
      "Jane Doe\nBackend Engineer\n\nSkills\nNode.js, PostgreSQL"
    );
    const jobBody = await createJobDescription(
      baseUrl,
      ownerToken,
      "Backend Engineer",
      "We need a backend engineer skilled in Node.js and PostgreSQL."
    );
    const jobId = jobBody.jobDescription.jobId;

    const suffix = crypto.randomBytes(4).toString("hex");
    const otherToken = await registerAndLogin(baseUrl, `other-${suffix}@example.com`, "Password123");
    // The other user needs their own stored job description, since job
    // ownership is checked before resume ownership.
    const otherJobBody = await createJobDescription(
      baseUrl,
      otherToken,
      "Backend Engineer",
      "We need a backend engineer skilled in Node.js and PostgreSQL."
    );

    try {
      const response = await fetch(`${baseUrl}/api/v1/job-match/${otherJobBody.jobDescription.jobId}/resume/${resumeId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${otherToken}` },
      });
      assert.equal(response.status, 404);
      const body = await response.json();
      assert.equal(body.status, "error");
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
    }

    // Also confirm a job description owned by someone else can't be matched either.
    const response2 = await fetch(`${baseUrl}/api/v1/job-match/${jobId}/resume/${resumeId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    assert.equal(response2.status, 404);
  });
});

test("POST /job-match/:jobId/resume/:resumeId rejects invalid ids", async () => {
  await withServer(async (baseUrl) => {
    const token = jwt.sign(
      { userId: "test-user", email: "test@example.com" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    const response = await fetch(`${baseUrl}/api/v1/job-match/not-a-uuid/resume/also-not-a-uuid`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 400);
  });
});

test("POST /job-match/:jobId/resume/:resumeId without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/job-match/${crypto.randomUUID()}/resume/${crypto.randomUUID()}`, {
      method: "POST",
    });
    assert.equal(response.status, 401);
  });
});
