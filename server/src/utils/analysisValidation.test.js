const test = require("node:test");
const assert = require("node:assert/strict");
const { validateAnalysisPayload, AIResponseValidationError } = require("./analysisValidation");

test("validateAnalysisPayload sanitizes and dedupes a well-formed payload", () => {
  const result = validateAnalysisPayload({
    summary: "  A backend engineer.  ",
    skills: ["Node.js", "Node.js", "  SQL  ", 42, null],
    education: [{ degree: " Bachelor of Science ", field: "CS" }, { degree: "" }, "not an object"],
    experience: [{ title: " Engineer ", company: "Acme" }, { company: "no title" }],
    strengths: ["Fast learner"],
    weaknesses: ["Limited experience"],
    recommendations: ["Add metrics"],
  });

  assert.equal(result.summary, "A backend engineer.");
  assert.deepEqual(result.skills, ["Node.js", "SQL"]);
  assert.equal(result.education.length, 1);
  assert.equal(result.education[0].degree, "Bachelor of Science");
  assert.equal(result.experience.length, 1);
  assert.equal(result.experience[0].title, "Engineer");
});

test("validateAnalysisPayload throws when the AI response is not an object", () => {
  assert.throws(() => validateAnalysisPayload("just a string"), AIResponseValidationError);
  assert.throws(() => validateAnalysisPayload(null), AIResponseValidationError);
  assert.throws(() => validateAnalysisPayload([1, 2, 3]), AIResponseValidationError);
});

test("validateAnalysisPayload throws when there is no usable signal at all", () => {
  assert.throws(
    () => validateAnalysisPayload({ summary: "", skills: [], education: [], experience: [] }),
    AIResponseValidationError
  );
});

test("validateAnalysisPayload defaults missing optional fields to empty arrays", () => {
  const result = validateAnalysisPayload({ summary: "Some summary text" });
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.education, []);
  assert.deepEqual(result.experience, []);
  assert.deepEqual(result.strengths, []);
  assert.deepEqual(result.weaknesses, []);
  assert.deepEqual(result.recommendations, []);
});
