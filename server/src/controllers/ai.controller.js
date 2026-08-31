const { getCompletion } = require("../services/ai.service");
const {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
} = require("../services/ai/errors");

const PING_SYSTEM_PROMPT =
  "You are a connectivity check for the AI Career Assistant backend.";
const PING_USER_PROMPT = "Reply with exactly one word: pong";

// Dev/test endpoint only: confirms the AI service layer (config, provider,
// transport, error handling) works end to end. Not a feature endpoint --
// resume analysis, ATS scoring, job matching, and interview prep are built
// on top of services/ai.service later, not here.
async function pingAI(req, res) {
  const startedAt = Date.now();

  try {
    const result = await getCompletion({
      systemPrompt: PING_SYSTEM_PROMPT,
      userPrompt: req.body?.prompt || PING_USER_PROMPT,
      maxTokens: 32,
    });

    res.json({
      status: "success",
      provider: result.provider,
      model: result.model,
      reply: result.content,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (error instanceof AIConfigurationError) {
      console.error("AI service misconfigured:", error.message);
      return res
        .status(500)
        .json({ status: "error", message: "AI service is not configured" });
    }
    if (error instanceof AITimeoutError) {
      return res
        .status(504)
        .json({ status: "error", message: "AI service request timed out" });
    }
    if (error instanceof AIRateLimitError) {
      return res.status(429).json({
        status: "error",
        message: "AI service rate limit exceeded, please retry later",
      });
    }
    if (error instanceof AIProviderError) {
      console.error("AI provider error:", error.message);
      return res
        .status(502)
        .json({ status: "error", message: "AI provider returned an error" });
    }

    console.error("AI connectivity check failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to reach AI service" });
  }
}

module.exports = { pingAI };
