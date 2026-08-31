const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
} = require("../errors");
const { complete } = require("./anthropic.provider");

// Stands in for the real Anthropic API so these tests exercise real HTTP
// end to end (matching this codebase's preference for real I/O over mocks)
// without needing network access or a real API key.
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
    AI_API_KEY: process.env.AI_API_KEY,
    AI_API_BASE_URL: process.env.AI_API_BASE_URL,
    AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
  };
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

test("complete throws AIConfigurationError when AI_API_KEY is missing", async () => {
  const original = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  try {
    await assert.rejects(
      () => complete({ systemPrompt: "sys", userPrompt: "hello" }),
      AIConfigurationError
    );
  } finally {
    if (original === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = original;
  }
});

test("complete returns the model's text and usage on success", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          model: "claude-sonnet-5",
          content: [{ type: "text", text: "pong" }],
          usage: { input_tokens: 12, output_tokens: 3 },
        })
      );
    },
    async () => {
      const result = await complete({ systemPrompt: "sys", userPrompt: "ping" });
      assert.equal(result.content, "pong");
      assert.equal(result.model, "claude-sonnet-5");
      assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 3 });
    }
  );
});

test("complete sends the configured model and credentials to the provider", async () => {
  let capturedRequest;
  await withFakeServer(
    (req, res, body) => {
      capturedRequest = { headers: req.headers, payload: JSON.parse(body) };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ content: [{ type: "text", text: "ok" }] }));
    },
    async () => {
      process.env.AI_MODEL = "claude-haiku-4-5-20251001";
      try {
        await complete({ systemPrompt: "sys", userPrompt: "hello" });
      } finally {
        delete process.env.AI_MODEL;
      }
    }
  );

  assert.equal(capturedRequest.headers["x-api-key"], "test-key");
  assert.equal(capturedRequest.payload.model, "claude-haiku-4-5-20251001");
  assert.equal(capturedRequest.payload.messages[0].content, "hello");
});

test("complete throws AIRateLimitError on a 429 response", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "rate limited" } }));
    },
    async () => {
      await assert.rejects(
        () => complete({ systemPrompt: "sys", userPrompt: "hello" }),
        AIRateLimitError
      );
    }
  );
});

test("complete throws AIProviderError on a non-2xx, non-429 response", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "internal provider failure" } }));
    },
    async () => {
      await assert.rejects(
        () => complete({ systemPrompt: "sys", userPrompt: "hello" }),
        AIProviderError
      );
    }
  );
});

test("complete throws AITimeoutError when the provider is too slow", async () => {
  await withFakeServer(
    (req, res) => {
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ content: [{ type: "text", text: "too late" }] }));
      }, 300);
    },
    async () => {
      process.env.AI_REQUEST_TIMEOUT_MS = "50";
      await assert.rejects(
        () => complete({ systemPrompt: "sys", userPrompt: "hello" }),
        AITimeoutError
      );
    }
  );
});
