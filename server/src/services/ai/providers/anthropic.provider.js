const axios = require("axios");
const {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
} = require("../errors");

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const MESSAGES_PATH = "/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.4;

// Read at call time, never at require time, so nothing throws just from
// loading this module and tests can flip AI_API_KEY/AI_MODEL/AI_API_BASE_URL
// between cases without re-requiring it.
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
      `${baseUrl}${MESSAGES_PATH}`,
      {
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
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

  const content = response.data?.content?.[0]?.text ?? "";

  return {
    model: response.data?.model || model,
    content,
    usage: response.data?.usage
      ? {
          inputTokens: response.data.usage.input_tokens,
          outputTokens: response.data.usage.output_tokens,
        }
      : null,
  };
}

module.exports = { complete, DEFAULT_MODEL };
