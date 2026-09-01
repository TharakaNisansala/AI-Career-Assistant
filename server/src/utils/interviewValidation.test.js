const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateQuestionsPayload,
  validateAnswerEvaluationPayload,
  validateAnswerSubmissionInput,
} = require("./interviewValidation");
const { AIResponseValidationError } = require("./analysisValidation");

test("validateQuestionsPayload sanitizes a well-formed AI response", () => {
  const result = validateQuestionsPayload({
    technicalQuestions: [
      { question: "  Explain event loop.  ", category: "  Node.js  " },
      { question: "", category: "dropped for empty question" },
      { question: 42 },
    ],
    behavioralQuestions: [{ question: "Tell me about a conflict you resolved." }],
  });

  assert.deepEqual(result.technicalQuestions, [{ question: "Explain event loop.", category: "Node.js" }]);
  assert.deepEqual(result.behavioralQuestions, [
    { question: "Tell me about a conflict you resolved.", category: "" },
  ]);
});

test("validateQuestionsPayload throws when the response is not an object", () => {
  assert.throws(() => validateQuestionsPayload("not json"), AIResponseValidationError);
  assert.throws(() => validateQuestionsPayload(null), AIResponseValidationError);
  assert.throws(() => validateQuestionsPayload(["a", "b"]), AIResponseValidationError);
});

test("validateQuestionsPayload throws when there are no usable questions", () => {
  assert.throws(
    () => validateQuestionsPayload({ technicalQuestions: [], behavioralQuestions: [] }),
    AIResponseValidationError
  );
});

test("validateAnswerEvaluationPayload sanitizes a well-formed AI response", () => {
  const result = validateAnswerEvaluationPayload({
    score: "87.6",
    strengths: ["Clear structure", "Clear structure"],
    weaknesses: ["Missed edge cases"],
    suggestions: ["Mention testing approach"],
  });

  assert.equal(result.score, 88);
  assert.deepEqual(result.strengths, ["Clear structure"]);
  assert.deepEqual(result.weaknesses, ["Missed edge cases"]);
  assert.deepEqual(result.suggestions, ["Mention testing approach"]);
});

test("validateAnswerEvaluationPayload clamps out-of-range scores", () => {
  assert.equal(validateAnswerEvaluationPayload({ score: 150 }).score, 100);
  assert.equal(validateAnswerEvaluationPayload({ score: -20 }).score, 0);
});

test("validateAnswerEvaluationPayload throws when the response is not an object", () => {
  assert.throws(() => validateAnswerEvaluationPayload("not json"), AIResponseValidationError);
  assert.throws(() => validateAnswerEvaluationPayload(null), AIResponseValidationError);
});

test("validateAnswerEvaluationPayload throws when there is no usable score", () => {
  assert.throws(() => validateAnswerEvaluationPayload({ strengths: ["ok"] }), AIResponseValidationError);
  assert.throws(() => validateAnswerEvaluationPayload({ score: "not a number" }), AIResponseValidationError);
});

test("validateAnswerSubmissionInput requires a questionId", () => {
  const errors = validateAnswerSubmissionInput({ questionId: "", answerText: "A sufficiently long answer." });
  assert.ok(errors.some((e) => e.includes("questionId")));
});

test("validateAnswerSubmissionInput rejects a too-short answer", () => {
  const errors = validateAnswerSubmissionInput({ questionId: "q1", answerText: "short" });
  assert.ok(errors.some((e) => e.includes("Answer must be at least")));
});

test("validateAnswerSubmissionInput accepts a valid submission", () => {
  const errors = validateAnswerSubmissionInput({
    questionId: "q1",
    answerText: "A sufficiently detailed answer to the question.",
  });
  assert.deepEqual(errors, []);
});
