const { generateCompletion } = require("./ai");

const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.4;

// Models are occasionally asked for JSON but still wrap it in a markdown
// code fence; strip that before parsing rather than rejecting otherwise-
// valid JSON over cosmetic formatting.
function stripCodeFences(text) {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : text;
}

function tryParseJson(text) {
  try {
    return JSON.parse(stripCodeFences(text));
  } catch {
    return null;
  }
}

// The single entry point the rest of the app uses to talk to an LLM.
// Provider selection, credentials, and transport details all stay behind
// ./ai -- callers only ever see this structured request/response shape, so
// future features (resume analysis, ATS scoring, job matching, interview
// prep) can all build on it without knowing which provider sits behind it.
//
// responseFormat: "text" (default) returns the model's raw reply; "json"
// additionally asks the model for JSON-only output and exposes it parsed
// as `parsedContent` (null if the model didn't return valid JSON).
async function getCompletion({
  systemPrompt,
  userPrompt,
  maxTokens = DEFAULT_MAX_TOKENS,
  temperature = DEFAULT_TEMPERATURE,
  responseFormat = "text",
}) {
  if (!userPrompt || typeof userPrompt !== "string") {
    throw new Error("userPrompt is required");
  }

  const effectiveSystemPrompt =
    responseFormat === "json"
      ? `${systemPrompt || ""}\nRespond with valid JSON only. Do not include markdown code fences or any prose outside the JSON.`.trim()
      : systemPrompt;

  const result = await generateCompletion({
    systemPrompt: effectiveSystemPrompt,
    userPrompt,
    maxTokens,
    temperature,
  });

  return {
    ...result,
    parsedContent: responseFormat === "json" ? tryParseJson(result.content) : null,
  };
}

module.exports = { getCompletion };
