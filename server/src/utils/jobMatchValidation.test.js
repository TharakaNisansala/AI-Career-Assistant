const test = require("node:test");
const assert = require("node:assert/strict");
const { validateJobRequirementsPayload } = require("./jobMatchValidation");
const { AIResponseValidationError } = require("./analysisValidation");

test("validateJobRequirementsPayload sanitizes a well-formed AI response", () => {
  const result = validateJobRequirementsPayload({
    requiredSkills: ["Node.js", "Node.js", "  SQL  "],
    preferredSkills: ["Docker"],
    minExperienceYears: "5",
    educationRequirement: "  Bachelor's degree  ",
    keywords: ["backend", "distributed systems"],
  });

  assert.deepEqual(result.requiredSkills, ["Node.js", "SQL"]);
  assert.deepEqual(result.preferredSkills, ["Docker"]);
  assert.equal(result.minExperienceYears, 5);
  assert.equal(result.educationRequirement, "Bachelor's degree");
  assert.deepEqual(result.keywords, ["backend", "distributed systems"]);
});

test("validateJobRequirementsPayload defaults a missing/negative minExperienceYears to 0", () => {
  const result = validateJobRequirementsPayload({ requiredSkills: ["SQL"], minExperienceYears: -3 });
  assert.equal(result.minExperienceYears, 0);
});

test("validateJobRequirementsPayload throws when the response is not an object", () => {
  assert.throws(() => validateJobRequirementsPayload("not json"), AIResponseValidationError);
  assert.throws(() => validateJobRequirementsPayload(null), AIResponseValidationError);
  assert.throws(() => validateJobRequirementsPayload(["a", "b"]), AIResponseValidationError);
});

test("validateJobRequirementsPayload throws when there is no usable signal", () => {
  assert.throws(
    () => validateJobRequirementsPayload({ requiredSkills: [], preferredSkills: [], keywords: [] }),
    AIResponseValidationError
  );
});
