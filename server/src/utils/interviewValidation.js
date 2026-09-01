// Coerces AI responses used by the interview prep pipeline into the shapes
// the rest of it relies on, mirroring analysisValidation.js/
// jobMatchValidation.js: drop malformed entries instead of rejecting the
// whole response, and only throw when there's nothing usable at all.
const { toStringArray, AIResponseValidationError } = require("./analysisValidation");

const MIN_ANSWER_LENGTH = 10;

function sanitizeQuestionList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item) => item && typeof item === "object" && typeof item.question === "string" && item.question.trim()
    )
    .map((item) => ({
      question: item.question.trim(),
      category: typeof item.category === "string" ? item.category.trim() : "",
    }));
}

function validateQuestionsPayload(parsedContent) {
  if (!parsedContent || typeof parsedContent !== "object" || Array.isArray(parsedContent)) {
    throw new AIResponseValidationError("AI response was not a valid JSON object");
  }

  const technicalQuestions = sanitizeQuestionList(parsedContent.technicalQuestions);
  const behavioralQuestions = sanitizeQuestionList(parsedContent.behavioralQuestions);

  if (technicalQuestions.length === 0 && behavioralQuestions.length === 0) {
    throw new AIResponseValidationError("AI response did not contain any usable interview questions");
  }

  return { technicalQuestions, behavioralQuestions };
}

function sanitizeScore(value) {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(num)));
}

// Unlike ats/job-match scoring, judging free-text answer quality isn't
// reducible to deterministic keyword arithmetic, so the AI's score is kept
// as-is (after clamping/validation) rather than the backend computing one.
function validateAnswerEvaluationPayload(parsedContent) {
  if (!parsedContent || typeof parsedContent !== "object" || Array.isArray(parsedContent)) {
    throw new AIResponseValidationError("AI response was not a valid JSON object");
  }

  const score = sanitizeScore(parsedContent.score);
  if (score === null) {
    throw new AIResponseValidationError("AI response did not contain a usable score");
  }

  return {
    score,
    strengths: toStringArray(parsedContent.strengths),
    weaknesses: toStringArray(parsedContent.weaknesses),
    suggestions: toStringArray(parsedContent.suggestions),
  };
}

// Validates the request body for submitting an answer, as distinct from
// validateAnswerEvaluationPayload above, which validates the AI's response.
function validateAnswerSubmissionInput({ questionId, answerText }) {
  const errors = [];

  if (!questionId || typeof questionId !== "string" || questionId.trim().length === 0) {
    errors.push("questionId is required");
  }

  if (!answerText || typeof answerText !== "string" || answerText.trim().length < MIN_ANSWER_LENGTH) {
    errors.push(`Answer must be at least ${MIN_ANSWER_LENGTH} characters long`);
  }

  return errors;
}

module.exports = {
  validateQuestionsPayload,
  validateAnswerEvaluationPayload,
  validateAnswerSubmissionInput,
};
