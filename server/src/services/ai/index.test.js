const test = require("node:test");
const assert = require("node:assert/strict");
const { AIConfigurationError } = require("./errors");
const { generateCompletion } = require("./index");

test("generateCompletion throws AIConfigurationError for an unsupported AI_PROVIDER", async () => {
  const original = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "does-not-exist";
  try {
    await assert.rejects(
      () => generateCompletion({ systemPrompt: "sys", userPrompt: "hello" }),
      AIConfigurationError
    );
  } finally {
    if (original === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = original;
  }
});

test("generateCompletion defaults to the anthropic provider", async () => {
  const original = process.env.AI_PROVIDER;
  delete process.env.AI_PROVIDER;
  const originalKey = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  try {
    // No AI_API_KEY configured, so this should fail inside the anthropic
    // provider (AIConfigurationError for the missing key) rather than at
    // provider selection -- proving "anthropic" is the resolved default.
    await assert.rejects(
      () => generateCompletion({ systemPrompt: "sys", userPrompt: "hello" }),
      (error) =>
        error instanceof AIConfigurationError && error.message.includes("AI_API_KEY")
    );
  } finally {
    if (original === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = original;
    if (originalKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = originalKey;
  }
});
