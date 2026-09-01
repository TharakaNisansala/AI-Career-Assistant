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
const interviewPrepRoutes = require("./interviewPrep.routes");

// Covers the full pipeline over HTTP: ownership checks on the resume (and
// job description, when selected), question generation, answer submission
// and AI evaluation, and AI/validation error mapping. Needs a real database
// (skipped when unreachable, same as jobMatch.routes.test.js) but never a
// real AI provider.
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", authRoutes);
  app.use("/api/v1", resumeRoutes);
  app.use("/api/v1", jobDescriptionRoutes);
  app.use("/api/v1", interviewPrepRoutes);
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

async function setupOwnerWithResume(baseUrl, emailPrefix) {
  const suffix = crypto.randomBytes(4).toString("hex");
  const token = await registerAndLogin(baseUrl, `${emailPrefix}-${suffix}@example.com`, "Password123");
  const pdfBuffer = await buildPdfBuffer(
    "Jane Doe\nSenior Backend Engineer\njane@example.com | 555-123-4567\n\n" +
      "Experience\nSenior Backend Engineer, Tech Corp\n\nSkills\nNode.js, PostgreSQL, Docker"
  );
  const uploadBody = await uploadResume(baseUrl, token, pdfBuffer, "resume.pdf", "application/pdf");
  return { token, resumeId: uploadBody.resume.resumeId };
}

const RESUME_FACTS_PAYLOAD = {
  summary: "Senior backend engineer with distributed systems experience.",
  skills: ["Node.js", "PostgreSQL", "Docker"],
  education: [],
  experience: [
    { title: "Senior Backend Engineer", company: "Tech Corp", startDate: "2019-01", endDate: "Present", description: "Led backend development." },
  ],
  strengths: ["Strong technical breadth"],
  weaknesses: ["Limited leadership examples"],
  recommendations: ["Add quantifiable achievements"],
};

const JOB_REQUIREMENTS_PAYLOAD = {
  requiredSkills: ["Node.js", "PostgreSQL"],
  preferredSkills: ["Docker"],
  minExperienceYears: 3,
  educationRequirement: "",
  keywords: ["backend"],
};

const QUESTIONS_PAYLOAD = {
  technicalQuestions: [
    { question: "How would you design a REST API for a resource with nested relationships?", category: "System Design" },
    { question: "What is the difference between SQL and NoSQL databases?", category: "Databases" },
  ],
  behavioralQuestions: [
    { question: "Tell me about a time you disagreed with a teammate.", category: "Teamwork" },
  ],
};

const ANSWER_EVALUATION_PAYLOAD = {
  score: 82,
  strengths: ["Clear explanation of the trade-offs"],
  weaknesses: ["Could mention scalability limits"],
  suggestions: ["Discuss how the design would scale under load"],
};

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

// Dispatches the fake AI response based on which prompt is being made: the
// interview prep pipeline can call up to three different prompts in one
// request (resume facts, job requirements, then interview questions), and
// answer submission calls a fourth (answer evaluation). Each prompt's
// distinguishing text is unique enough to route on.
async function withFakeAIProvider(run) {
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
      if (userContent.includes("Resume text:")) {
        payload = RESUME_FACTS_PAYLOAD;
      } else if (userContent.includes("Job description:")) {
        payload = JOB_REQUIREMENTS_PAYLOAD;
      } else if (userContent.includes("Evaluate this candidate's answer")) {
        payload = ANSWER_EVALUATION_PAYLOAD;
      } else {
        payload = QUESTIONS_PAYLOAD;
      }
      fakeAiJsonResponse(payload)(req, res);
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

async function withFailingAIProvider(run) {
  const server = http.createServer((req, res) => {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "internal provider failure" } }));
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

test("POST /interview-prep/sessions generates technical and behavioral questions from a resume", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed interview prep tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "questions");

    try {
      await withFakeAIProvider(async () => {
        const response = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ resumeId, targetRole: "Backend Engineer" }),
        });
        assert.equal(response.status, 201);
        const body = await response.json();
        assert.equal(body.status, "success");

        const { session } = body;
        assert.ok(session.sessionId);
        assert.equal(session.resumeId, resumeId);
        assert.equal(session.jobId, null);
        assert.equal(session.targetRole, "Backend Engineer");
        assert.equal(session.questions.length, 3);
        assert.equal(session.questions.filter((q) => q.type === "technical").length, 2);
        assert.equal(session.questions.filter((q) => q.type === "behavioral").length, 1);
        assert.ok(session.questions.every((q) => typeof q.questionId === "string" && q.question));

        const listResponse = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const listBody = await listResponse.json();
        assert.equal(listBody.sessions.length, 1);
      });
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /interview-prep/sessions considers the selected job description and falls back to its title", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed interview prep tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "withjob");
    const jobBody = await createJobDescription(
      baseUrl,
      token,
      "Backend Engineer",
      "We need a backend engineer skilled in Node.js and PostgreSQL."
    );
    const jobId = jobBody.jobDescription.jobId;

    try {
      await withFakeAIProvider(async () => {
        const response = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ resumeId, jobId }),
        });
        assert.equal(response.status, 201);
        const body = await response.json();

        const { session } = body;
        assert.equal(session.jobId, jobId);
        assert.equal(session.targetRole, "Backend Engineer");
        assert.ok(session.questions.length > 0);
      });
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /interview-prep/sessions/:sessionId/answers evaluates a submitted answer and stores it", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed interview prep tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "answer");

    try {
      let sessionId;
      let questionId;

      await withFakeAIProvider(async () => {
        const sessionResponse = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ resumeId }),
        });
        const sessionBody = await sessionResponse.json();
        sessionId = sessionBody.session.sessionId;
        questionId = sessionBody.session.questions[0].questionId;

        const answerResponse = await fetch(
          `${baseUrl}/api/v1/interview-prep/sessions/${sessionId}/answers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              questionId,
              answerText: "I would design the API around resource-oriented URLs with nested routes.",
            }),
          }
        );
        assert.equal(answerResponse.status, 201);
        const answerBody = await answerResponse.json();
        assert.equal(answerBody.status, "success");

        const { answer } = answerBody;
        assert.equal(answer.questionId, questionId);
        assert.ok(answer.score >= 0 && answer.score <= 100);
        assert.ok(answer.strengths.length > 0);
        assert.ok(answer.weaknesses.length > 0);
        assert.ok(answer.suggestions.length > 0);
      });

      const detailResponse = await fetch(`${baseUrl}/api/v1/interview-prep/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detailBody = await detailResponse.json();
      assert.equal(detailBody.answers.length, 1);
      assert.equal(detailBody.answers[0].questionId, questionId);
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /interview-prep/sessions/:sessionId/answers rejects a too-short answer", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed interview prep tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "shortanswer");

    try {
      await withFakeAIProvider(async () => {
        const sessionResponse = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ resumeId }),
        });
        const sessionBody = await sessionResponse.json();
        const { sessionId } = sessionBody.session;
        const questionId = sessionBody.session.questions[0].questionId;

        const answerResponse = await fetch(
          `${baseUrl}/api/v1/interview-prep/sessions/${sessionId}/answers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ questionId, answerText: "short" }),
          }
        );
        assert.equal(answerResponse.status, 400);
        const body = await answerResponse.json();
        assert.equal(body.status, "error");
      });
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /interview-prep/sessions/:sessionId/answers returns 404 for an unknown question id", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed interview prep tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "badquestion");

    try {
      await withFakeAIProvider(async () => {
        const sessionResponse = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ resumeId }),
        });
        const sessionBody = await sessionResponse.json();
        const { sessionId } = sessionBody.session;

        const answerResponse = await fetch(
          `${baseUrl}/api/v1/interview-prep/sessions/${sessionId}/answers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              questionId: "does-not-exist",
              answerText: "A sufficiently long answer to a question that does not exist.",
            }),
          }
        );
        assert.equal(answerResponse.status, 404);
      });
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("GET /interview-prep/sessions/:sessionId returns 404 when the session belongs to another user", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed interview prep tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token: ownerToken, resumeId } = await setupOwnerWithResume(baseUrl, "owner");

    try {
      let sessionId;
      await withFakeAIProvider(async () => {
        const sessionResponse = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ resumeId }),
        });
        const sessionBody = await sessionResponse.json();
        sessionId = sessionBody.session.sessionId;
      });

      const suffix = crypto.randomBytes(4).toString("hex");
      const otherToken = await registerAndLogin(baseUrl, `other-${suffix}@example.com`, "Password123");

      const response = await fetch(`${baseUrl}/api/v1/interview-prep/sessions/${sessionId}`, {
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

test("POST /interview-prep/sessions returns 404 when the resume belongs to another user", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed interview prep tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token: ownerToken, resumeId } = await setupOwnerWithResume(baseUrl, "resumeowner");
    const suffix = crypto.randomBytes(4).toString("hex");
    const otherToken = await registerAndLogin(baseUrl, `other-${suffix}@example.com`, "Password123");

    try {
      const response = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${otherToken}` },
        body: JSON.stringify({ resumeId }),
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

test("POST /interview-prep/sessions returns 502 when the AI provider fails", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed interview prep tests");
    return;
  }

  await withServer(async (baseUrl) => {
    const { token, resumeId } = await setupOwnerWithResume(baseUrl, "aifail");

    try {
      await withFailingAIProvider(async () => {
        const response = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ resumeId }),
        });
        assert.equal(response.status, 502);
        const body = await response.json();
        assert.equal(body.status, "error");
      });
    } finally {
      await fetch(`${baseUrl}/api/v1/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});

test("POST /interview-prep/sessions rejects an invalid resumeId", async () => {
  await withServer(async (baseUrl) => {
    const token = jwt.sign(
      { userId: "test-user", email: "test@example.com" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    const response = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ resumeId: "not-a-uuid" }),
    });
    assert.equal(response.status, 400);
  });
});

test("POST /interview-prep/sessions without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/interview-prep/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId: crypto.randomUUID() }),
    });
    assert.equal(response.status, 401);
  });
});
