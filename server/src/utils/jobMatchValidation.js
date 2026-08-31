// Coerces the AI's job-requirements extraction into the shape the scoring
// pipeline relies on. Mirrors utils/analysisValidation.js's approach for
// resume facts: reuses its toStringArray/AIResponseValidationError rather
// than duplicating them, drops malformed entries instead of rejecting the
// whole response, and only throws when there's nothing usable at all.
const { toStringArray, AIResponseValidationError } = require("./analysisValidation");

function sanitizeMinExperienceYears(value) {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num) || num < 0) {
    return 0;
  }
  return Math.round(num * 10) / 10;
}

function validateJobRequirementsPayload(parsedContent) {
  if (!parsedContent || typeof parsedContent !== "object" || Array.isArray(parsedContent)) {
    throw new AIResponseValidationError("AI response was not a valid JSON object");
  }

  const sanitized = {
    requiredSkills: toStringArray(parsedContent.requiredSkills),
    preferredSkills: toStringArray(parsedContent.preferredSkills),
    minExperienceYears: sanitizeMinExperienceYears(parsedContent.minExperienceYears),
    educationRequirement:
      typeof parsedContent.educationRequirement === "string"
        ? parsedContent.educationRequirement.trim()
        : "",
    keywords: toStringArray(parsedContent.keywords),
  };

  const hasAnySignal =
    sanitized.requiredSkills.length > 0 ||
    sanitized.preferredSkills.length > 0 ||
    sanitized.minExperienceYears > 0 ||
    sanitized.educationRequirement.length > 0 ||
    sanitized.keywords.length > 0;

  if (!hasAnySignal) {
    throw new AIResponseValidationError("AI response did not contain any usable job requirement data");
  }

  return sanitized;
}

module.exports = { validateJobRequirementsPayload };
