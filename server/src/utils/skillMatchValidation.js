// Coerces the AI's holistic skill-fit evaluation into the shape the scoring
// pipeline relies on. Mirrors utils/jobMatchValidation.js's approach: reuses
// analysisValidation's toStringArray/AIResponseValidationError rather than
// duplicating them, drops malformed entries instead of rejecting the whole
// response, and only throws when there's nothing usable at all.
const { toStringArray, AIResponseValidationError } = require("./analysisValidation");

function sanitizeSkillMatchScore(value) {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(num)));
}

function sanitizePartiallyCoveredSkills(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.requiredSkill === "string" &&
        item.requiredSkill.trim() &&
        typeof item.coveredBy === "string" &&
        item.coveredBy.trim()
    )
    .map((item) => ({
      requiredSkill: item.requiredSkill.trim(),
      coveredBy: item.coveredBy.trim(),
      note: typeof item.note === "string" ? item.note.trim() : "",
    }));
}

// Coerces a parsed AI response into the shape the scoring pipeline relies on.
// Only rejects outright when the response isn't an object at all, or
// contains nothing usable -- a genuinely poor candidate can still produce a
// legitimate low score with a populated missingSkills list, so an empty
// matchedSkills/partiallyCoveredSkills array alone is not itself a problem.
function validateSkillMatchPayload(parsedContent) {
  if (!parsedContent || typeof parsedContent !== "object" || Array.isArray(parsedContent)) {
    throw new AIResponseValidationError("AI response was not a valid JSON object");
  }

  const rawScore = sanitizeSkillMatchScore(parsedContent.skillMatchScore);

  const sanitized = {
    skillMatchScore: rawScore === null ? 0 : rawScore,
    matchedSkills: toStringArray(parsedContent.matchedSkills),
    partiallyCoveredSkills: sanitizePartiallyCoveredSkills(parsedContent.partiallyCoveredSkills),
    missingSkills: toStringArray(parsedContent.missingSkills),
    overallAssessment:
      typeof parsedContent.overallAssessment === "string" ? parsedContent.overallAssessment.trim() : "",
  };

  const hasAnySignal =
    rawScore !== null ||
    sanitized.matchedSkills.length > 0 ||
    sanitized.partiallyCoveredSkills.length > 0 ||
    sanitized.missingSkills.length > 0 ||
    sanitized.overallAssessment.length > 0;

  if (!hasAnySignal) {
    throw new AIResponseValidationError("AI response did not contain any usable skill-match data");
  }

  return sanitized;
}

module.exports = { validateSkillMatchPayload };
