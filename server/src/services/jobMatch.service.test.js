const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const http = require("node:http");
const pool = require("../config/database");
const { AIProviderError } = require("./ai/errors");
const { AIResponseValidationError } = require("../utils/analysisValidation");
const { requestAiJobRequirements, saveJobMatch } = require("./jobMatch.service");

// Mirrors resumeAnalysis.service.test.js: a local fake HTTP server standing
// in for the Anthropic API, so no real API key or network access is needed.
async function withFakeServer(respond, run) {
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

test("requestAiJobRequirements returns sanitized structured data from a valid AI response", async () => {
  await withFakeServer(
    fakeAiTextResponse(
      JSON.stringify({
        requiredSkills: ["Node.js", "Node.js", "  SQL  "],
        preferredSkills: ["Docker"],
        minExperienceYears: 4,
        educationRequirement: "Bachelor's degree",
        keywords: ["backend"],
      })
    ),
    async () => {
      const requirements = await requestAiJobRequirements("job description text");
      assert.deepEqual(requirements.requiredSkills, ["Node.js", "SQL"]);
      assert.deepEqual(requirements.preferredSkills, ["Docker"]);
      assert.equal(requirements.minExperienceYears, 4);
    }
  );
});

test("requestAiJobRequirements throws AIResponseValidationError when the AI does not return JSON", async () => {
  await withFakeServer(fakeAiTextResponse("Sure, here are the requirements in plain prose."), async () => {
    await assert.rejects(() => requestAiJobRequirements("job description text"), AIResponseValidationError);
  });
});

test("requestAiJobRequirements throws AIResponseValidationError when the AI returns JSON with no usable facts", async () => {
  await withFakeServer(
    fakeAiTextResponse(JSON.stringify({ requiredSkills: [], preferredSkills: [], keywords: [] })),
    async () => {
      await assert.rejects(() => requestAiJobRequirements("job description text"), AIResponseValidationError);
    }
  );
});

test("requestAiJobRequirements propagates AI provider failures unchanged", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "internal provider failure" } }));
    },
    async () => {
      await assert.rejects(() => requestAiJobRequirements("job description text"), AIProviderError);
    }
  );
});

test("saveJobMatch rejects when the job description does not exist (database foreign key violation)", async (t) => {
  if (!(await isDatabaseReachable())) {
    t.skip("Database is not reachable in this environment; skipping DB-backed test");
    return;
  }

  await assert.rejects(() =>
    saveJobMatch({
      jobId: crypto.randomUUID(),
      resumeId: crypto.randomUUID(),
      matchPercentage: 50,
      breakdown: [],
      matchedSkills: [],
      missingSkills: [],
      strengths: [],
      recommendations: [],
    })
  );
});
