const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { AIProviderError } = require("./ai/errors");
const { getCompletion } = require("./ai.service");

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

test("getCompletion requires a userPrompt", async () => {
  await assert.rejects(() => getCompletion({ systemPrompt: "sys" }), /userPrompt is required/);
});

test("getCompletion returns text content by default with no parsedContent", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ content: [{ type: "text", text: "hello there" }] }));
    },
    async () => {
      const result = await getCompletion({ systemPrompt: "sys", userPrompt: "hi" });
      assert.equal(result.content, "hello there");
      assert.equal(result.parsedContent, null);
    }
  );
});

test("getCompletion parses JSON content when responseFormat is json", async () => {
  let capturedPayload;
  await withFakeServer(
    (req, res, body) => {
      capturedPayload = JSON.parse(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          content: [{ type: "text", text: '{"score": 42}' }],
        })
      );
    },
    async () => {
      const result = await getCompletion({
        systemPrompt: "sys",
        userPrompt: "hi",
        responseFormat: "json",
      });
      assert.deepEqual(result.parsedContent, { score: 42 });
      assert.match(capturedPayload.system, /Respond with valid JSON only/);
    }
  );
});

test("getCompletion strips markdown code fences before parsing JSON", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          content: [{ type: "text", text: '```json\n{"ok": true}\n```' }],
        })
      );
    },
    async () => {
      const result = await getCompletion({
        systemPrompt: "sys",
        userPrompt: "hi",
        responseFormat: "json",
      });
      assert.deepEqual(result.parsedContent, { ok: true });
    }
  );
});

test("getCompletion sets parsedContent to null on invalid JSON instead of throwing", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ content: [{ type: "text", text: "not json" }] }));
    },
    async () => {
      const result = await getCompletion({
        systemPrompt: "sys",
        userPrompt: "hi",
        responseFormat: "json",
      });
      assert.equal(result.parsedContent, null);
      assert.equal(result.content, "not json");
    }
  );
});

test("getCompletion propagates provider errors unchanged", async () => {
  await withFakeServer(
    (req, res) => {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "provider down" } }));
    },
    async () => {
      await assert.rejects(
        () => getCompletion({ systemPrompt: "sys", userPrompt: "hi" }),
        AIProviderError
      );
    }
  );
});
