const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const pool = require("../config/database");
const { AIProviderError } = require("./ai/errors");
const { AIResponseValidationError } = require("../utils/analysisValidation");
const { requestAiAnalysis, saveAnalysis } = require("./resumeAnalysis.service");

// Mirrors ai.service.test.js: a local fake HTTP server standing in for the
// Anthropic API, so no real API key or network access is needed.
async function withFakeServer(respond, run) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => respond(req, res, body));
  });
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const original = { AI_API_KEY: process.env.AI_API_KEY, AI_API_BASE_URL: process.env.AI_API_BASE_URL };
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

function fakeAiTextResponse(text) {
  return (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ content: [{ type: "text", text }] }));
  };
}

async function isDatabaseReachable() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

test("requestAiAnalysis returns sanitized structured data from a valid AI response", async () => {
  await withFakeServer(
    fakeAiTextResponse(
      JSON.stringify({
        summary: "Backend engineer.",
        skills: ["Node.js", "Node.js", "  SQL  "],
        education: [{ degree: "Bachelor of Science" }],
        experience: [{ title: "Engineer", company: "Acme" }],
        strengths: ["Strong fundamentals"],
        weaknesses: ["Needs more leadership examples"],
        recommendations: ["Quantify achievements"],
      })
    ),
    async () => {
      const extracted = await requestAiAnalysis("resume text");
      assert.deepEqual(extracted.skills, ["Node.js", "SQL"]);
      assert.equal(extracted.education.length, 1);
      assert.equal(extracted.experience.length, 1);
    }
  );
});

test("requestAiAnalysis throws AIResponseValidationError when the AI does not return JSON", async () => {
  await withFakeServer(fakeAiTextResponse("Sure, here is my analysis in plain prose."), async () => {
    await assert.rejects(() => requestAiAnalysis("resume text"), AIResponseValidationError);
  });
});

test("requestAiAnalysis throws AIResponseValidationError when the AI returns JSON with no usable facts", async () => {
  await withFakeServer(fakeAiTextResponse(JSON.stringify({ skills: [], education: [], experience: [] })), async () => {
    await assert.rejects(() => requestAiAnalysis("resume text"), AIResponseValidationError);
  });
});

test("requestAiAnalysis propagates AI provider failures unchanged", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "internal provider failure" } }));
    },
    async () => {
      await assert.rejects(() => requestAiAnalysis("resume text"), AIProviderError);
    }
  );
});

test("saveAnalysis rejects when the resume does not exist (database foreign key violation)", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed test");
    return;
  }

  await assert.rejects(() =>
    saveAnalysis({
      resumeId: crypto.randomUUID(),
      atsScore: 50,
      breakdown: [],
      extracted: {
        summary: "",
        skills: [],
        education: [],
        experience: [],
        strengths: [],
        weaknesses: [],
        recommendations: [],
      },
    })
  );
});
