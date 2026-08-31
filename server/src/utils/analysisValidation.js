// Thrown when the AI's analysis response can't be trusted enough to score
// or store: not JSON, not an object, or containing no usable resume facts
// at all. Distinct from the AI* transport errors in services/ai/errors.js,
// which cover the AI service failing to respond at all.
class AIResponseValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AIResponseValidationError";
  }
}

function toStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [
    ...new Set(
      value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    ),
  ];
}

function sanitizeEducation(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item) => item && typeof item === "object" && typeof item.degree === "string" && item.degree.trim()
    )
    .map((item) => ({
      degree: item.degree.trim(),
      field: typeof item.field === "string" ? item.field.trim() : "",
      institution: typeof item.institution === "string" ? item.institution.trim() : "",
      graduationYear:
        typeof item.graduationYear === "string" || typeof item.graduationYear === "number"
          ? String(item.graduationYear).trim()
          : "",
    }));
}

function sanitizeExperience(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item) => item && typeof item === "object" && typeof item.title === "string" && item.title.trim()
    )
    .map((item) => ({
      title: item.title.trim(),
      company: typeof item.company === "string" ? item.company.trim() : "",
      startDate: typeof item.startDate === "string" ? item.startDate.trim() : "",
      endDate: typeof item.endDate === "string" ? item.endDate.trim() : "",
      description: typeof item.description === "string" ? item.description.trim() : "",
    }));
}

// Coerces a parsed AI response into the shape the rest of the pipeline
// relies on, dropping any entries that don't match the expected shape
// rather than rejecting the whole response over partial noise. Only rejects
// outright when the response isn't an object at all, or contains nothing
// usable, since neither can be scored or is worth storing.
function validateAnalysisPayload(parsedContent) {
  if (!parsedContent || typeof parsedContent !== "object" || Array.isArray(parsedContent)) {
    throw new AIResponseValidationError("AI response was not a valid JSON object");
  }

  const sanitized = {
    summary: typeof parsedContent.summary === "string" ? parsedContent.summary.trim() : "",
    skills: toStringArray(parsedContent.skills),
    education: sanitizeEducation(parsedContent.education),
    experience: sanitizeExperience(parsedContent.experience),
    strengths: toStringArray(parsedContent.strengths),
    weaknesses: toStringArray(parsedContent.weaknesses),
    recommendations: toStringArray(parsedContent.recommendations),
  };

  const hasAnySignal =
    sanitized.summary.length > 0 ||
    sanitized.skills.length > 0 ||
    sanitized.education.length > 0 ||
    sanitized.experience.length > 0;

  if (!hasAnySignal) {
    throw new AIResponseValidationError("AI response did not contain any usable resume analysis data");
  }

  return sanitized;
}

module.exports = { validateAnalysisPayload, AIResponseValidationError };
