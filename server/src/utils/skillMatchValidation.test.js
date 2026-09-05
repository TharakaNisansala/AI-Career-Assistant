const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSkillMatchPayload } = require("./skillMatchValidation");
const { AIResponseValidationError } = require("./analysisValidation");

test("validateSkillMatchPayload sanitizes a well-formed AI response", () => {
  const result = validateSkillMatchPayload({
    skillMatchScore: "82.6",
    matchedSkills: ["Node.js", "Node.js", "  PostgreSQL  "],
    partiallyCoveredSkills: [
      { requiredSkill: "Angular", coveredBy: "Vue.js", note: "Comparable component-based frontend framework." },
      { requiredSkill: "  ", coveredBy: "React" },
      { requiredSkill: "Kubernetes", coveredBy: "  " },
    ],
    missingSkills: ["GraphQL"],
    overallAssessment: "  Strong overall fit with one genuine gap.  ",
  });

  assert.equal(result.skillMatchScore, 83);
  assert.deepEqual(result.matchedSkills, ["Node.js", "PostgreSQL"]);
  assert.deepEqual(result.partiallyCoveredSkills, [
    { requiredSkill: "Angular", coveredBy: "Vue.js", note: "Comparable component-based frontend framework." },
  ]);
  assert.deepEqual(result.missingSkills, ["GraphQL"]);
  assert.equal(result.overallAssessment, "Strong overall fit with one genuine gap.");
});

test("validateSkillMatchPayload clamps an out-of-range score", () => {
  assert.equal(validateSkillMatchPayload({ skillMatchScore: 150 }).skillMatchScore, 100);
  assert.equal(validateSkillMatchPayload({ skillMatchScore: -20 }).skillMatchScore, 0);
});

test("validateSkillMatchPayload defaults a missing score to 0 when other fields carry signal", () => {
  const result = validateSkillMatchPayload({ missingSkills: ["Docker"] });
  assert.equal(result.skillMatchScore, 0);
  assert.deepEqual(result.missingSkills, ["Docker"]);
});

test("validateSkillMatchPayload throws when the response is not an object", () => {
  assert.throws(() => validateSkillMatchPayload("not json"), AIResponseValidationError);
  assert.throws(() => validateSkillMatchPayload(null), AIResponseValidationError);
  assert.throws(() => validateSkillMatchPayload(["a", "b"]), AIResponseValidationError);
});

test("validateSkillMatchPayload throws when there is no usable signal at all", () => {
  assert.throws(
    () =>
      validateSkillMatchPayload({
        matchedSkills: [],
        partiallyCoveredSkills: [],
        missingSkills: [],
        overallAssessment: "",
      }),
    AIResponseValidationError
  );
  assert.throws(() => validateSkillMatchPayload({}), AIResponseValidationError);
});
