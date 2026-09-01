const axios = require("axios");
const {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
} = require("../errors");

// Groq exposes an OpenAI-compatible chat completions endpoint, so this
// provider mirrors anthropic.provider.js's shape (same config seam, same
// error mapping) but speaks the OpenAI request/response format instead.
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const CHAT_COMPLETIONS_PATH = "/chat/completions";
// Free-tier model with strong instruction-following for the structured JSON
// extraction this app relies on (resume facts, job requirements, interview
// questions/evaluations). llama-3.3-70b-versatile was the original pick here
// but Groq has since retired it from the catalog; verify against
// GET /openai/v1/models before changing this again -- Groq's free-tier
// lineup turns over.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.4;

// Read at call time, never at require time, so nothing throws just from
// loading this module and tests can flip AI_API_KEY/AI_MODEL/AI_API_BASE_URL
// between cases without re-requiring it. Reuses the same generic AI_* env
// vars as anthropic.provider.js (selected via AI_PROVIDER) rather than
// provider-namespaced ones, since only one provider is active at a time.
function loadConfig() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new AIConfigurationError("AI_API_KEY is not configured");
  }

  return {
    apiKey,
    model: process.env.AI_MODEL || DEFAULT_MODEL,
    baseUrl: process.env.AI_API_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  };
}

async function complete({
  systemPrompt,
  userPrompt,
  maxTokens = DEFAULT_MAX_TOKENS,
  temperature = DEFAULT_TEMPERATURE,
}) {
  const { apiKey, model, baseUrl, timeoutMs } = loadConfig();

  let response;
  try {
    response = await axios.post(
      `${baseUrl}${CHAT_COMPLETIONS_PATH}`,
      {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        timeout: timeoutMs,
      }
    );
  } catch (error) {
    if (error.code === "ECONNABORTED" || /timeout/i.test(error.message || "")) {
      throw new AITimeoutError(`AI request timed out after ${timeoutMs}ms`);
    }

    const status = error.response?.status;
    if (status === 429) {
      throw new AIRateLimitError("AI provider rate limit exceeded");
    }
    if (status) {
      const detail = error.response?.data?.error?.message || error.message;
      throw new AIProviderError(`AI provider returned an error: ${detail}`, status);
    }

    throw new AIProviderError(`Unable to reach AI provider: ${error.message}`);
  }

  const content = response.data?.choices?.[0]?.message?.content ?? "";

  return {
    model: response.data?.model || model,
    content,
    usage: response.data?.usage
      ? {
          inputTokens: response.data.usage.prompt_tokens,
          outputTokens: response.data.usage.completion_tokens,
        }
      : null,
  };
}

module.exports = { complete, DEFAULT_MODEL };
