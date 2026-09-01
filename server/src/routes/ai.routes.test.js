const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");
const aiRoutes = require("./ai.routes");

// Covers routing and HTTP-status mapping for the AI ping endpoint. Uses a
// local fake HTTP server standing in for the Anthropic API (see
// services/ai/providers/anthropic.provider.test.js), so no real API key or
// network access is needed, and builds its own JWT instead of a full
// register/login flow, so this suite needs no database connection.
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", aiRoutes);
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

function buildToken() {
  return jwt.sign(
    { userId: "test-user", email: "test@example.com" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
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
  // responds in Anthropic's response shape, and the "reports the model's
  // reply" test asserts body.provider === "anthropic".
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

test("POST /ai/ping without a token is rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/ai/ping`, { method: "POST" });
    assert.equal(response.status, 401);
  });
});

test("POST /ai/ping returns the model's reply when the AI provider is reachable", async () => {
  await withFakeAIProvider(
    (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          model: "claude-sonnet-5",
          content: [{ type: "text", text: "pong" }],
          usage: { input_tokens: 10, output_tokens: 2 },
        })
      );
    },
    async () => {
      await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/ai/ping`, {
          method: "POST",
          headers: { Authorization: `Bearer ${buildToken()}` },
        });
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.status, "success");
        assert.equal(body.reply, "pong");
        assert.equal(body.provider, "anthropic");
      });
    }
  );
});

test("POST /ai/ping reports 500 when the AI service is not configured", async () => {
  const original = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/ai/ping`, {
        method: "POST",
        headers: { Authorization: `Bearer ${buildToken()}` },
      });
      assert.equal(response.status, 500);
      const body = await response.json();
      assert.equal(body.status, "error");
    });
  } finally {
    if (original === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = original;
  }
});

test("POST /ai/ping reports 502 when the AI provider returns an upstream error", async () => {
  await withFakeAIProvider(
    (req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "internal provider failure" } }));
    },
    async () => {
      await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/ai/ping`, {
          method: "POST",
          headers: { Authorization: `Bearer ${buildToken()}` },
        });
        assert.equal(response.status, 502);
      });
    }
  );
});

test("POST /ai/ping reports 429 when the AI provider rate-limits the request", async () => {
  await withFakeAIProvider(
    (req, res) => {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "rate limited" } }));
    },
    async () => {
      await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/ai/ping`, {
          method: "POST",
          headers: { Authorization: `Bearer ${buildToken()}` },
        });
        assert.equal(response.status, 429);
      });
    }
  );
});
