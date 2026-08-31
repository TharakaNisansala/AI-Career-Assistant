const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateJobMatch } = require("./jobMatchScoring.service");

const BASE_RESUME_FACTS = {
  summary: "",
  skills: [],
  education: [],
  experience: [],
  strengths: [],
  weaknesses: [],
  recommendations: [],
};

const BASE_JOB_REQUIREMENTS = {
  requiredSkills: [],
  preferredSkills: [],
  minExperienceYears: 0,
  educationRequirement: "",
  keywords: [],
};

test("calculateJobMatch weights sum to 1", () => {
  const { breakdown } = calculateJobMatch({
    resumeText: "",
    resumeFacts: BASE_RESUME_FACTS,
    jobRequirements: BASE_JOB_REQUIREMENTS,
  });
  const totalWeight = breakdown.reduce((sum, category) => sum + category.weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9);
});

test("calculateJobMatch is deterministic for the same input", () => {
  const resumeFacts = { ...BASE_RESUME_FACTS, skills: ["Node.js", "SQL"] };
  const jobRequirements = { ...BASE_JOB_REQUIREMENTS, requiredSkills: ["Node.js"] };
  const first = calculateJobMatch({ resumeText: "some resume text", resumeFacts, jobRequirements });
  const second = calculateJobMatch({ resumeText: "some resume text", resumeFacts, jobRequirements });
  assert.deepEqual(first, second);
});

test("calculateJobMatch scores a strong candidate highly and reports full matched skills", () => {
  const resumeFacts = {
    ...BASE_RESUME_FACTS,
    summary: "Senior backend engineer with distributed systems experience.",
    skills: ["Node.js", "JavaScript", "PostgreSQL", "Docker", "AWS", "REST APIs"],
    education: [{ degree: "Bachelor of Science in Computer Science", field: "", institution: "", graduationYear: "" }],
    experience: [{ title: "Senior Engineer", company: "Acme", startDate: "2016-01", endDate: "Present", description: "" }],
  };
  const jobRequirements = {
    requiredSkills: ["Node.js", "PostgreSQL", "Docker"],
    preferredSkills: ["AWS"],
    minExperienceYears: 5,
    educationRequirement: "Bachelor's degree in Computer Science",
    keywords: ["backend", "distributed"],
  };
  const resumeText = "Senior backend engineer with 8 years of experience building distributed backend systems.";

  const { matchPercentage, matchedSkills, missingSkills, strengths, recommendations } = calculateJobMatch({
    resumeText,
    resumeFacts,
    jobRequirements,
  });

  assert.ok(matchPercentage >= 80, `expected a high match percentage, got ${matchPercentage}`);
  assert.deepEqual(missingSkills, []);
  assert.ok(matchedSkills.includes("Node.js"));
  assert.ok(matchedSkills.includes("PostgreSQL"));
  assert.ok(matchedSkills.includes("Docker"));
  assert.ok(strengths.length > 0);
  assert.ok(recommendations.length > 0);
});

test("calculateJobMatch scores a poor candidate low and identifies missing skills", () => {
  const resumeFacts = {
    ...BASE_RESUME_FACTS,
    skills: ["Photoshop", "Illustrator"],
    education: [],
    experience: [],
  };
  const jobRequirements = {
    requiredSkills: ["Node.js", "PostgreSQL", "Docker"],
    preferredSkills: ["AWS"],
    minExperienceYears: 5,
    educationRequirement: "Bachelor's degree in Computer Science",
    keywords: ["backend", "distributed"],
  };
  const resumeText = "Graphic designer specializing in branding and print media.";

  const { matchPercentage, matchedSkills, missingSkills, recommendations } = calculateJobMatch({
    resumeText,
    resumeFacts,
    jobRequirements,
  });

  assert.ok(matchPercentage < 30, `expected a low match percentage, got ${matchPercentage}`);
  assert.deepEqual(matchedSkills, []);
  assert.deepEqual(missingSkills, ["Node.js", "PostgreSQL", "Docker"]);
  assert.ok(recommendations.some((rec) => rec.includes("Node.js")));
});

test("calculateJobMatch identifies partially missing skills for a partial match", () => {
  const resumeFacts = { ...BASE_RESUME_FACTS, skills: ["Node.js", "MongoDB"] };
  const jobRequirements = { ...BASE_JOB_REQUIREMENTS, requiredSkills: ["Node.js", "PostgreSQL", "GraphQL"] };

  const { matchedSkills, missingSkills } = calculateJobMatch({
    resumeText: "",
    resumeFacts,
    jobRequirements,
  });

  assert.deepEqual(matchedSkills, ["Node.js"]);
  assert.deepEqual(missingSkills, ["PostgreSQL", "GraphQL"]);
});

test("calculateJobMatch defaults to a neutral skills score when the job specifies no skills", () => {
  const resumeFacts = { ...BASE_RESUME_FACTS, skills: ["Node.js"] };
  const { breakdown } = calculateJobMatch({ resumeText: "", resumeFacts, jobRequirements: BASE_JOB_REQUIREMENTS });
  const skillsCategory = breakdown.find((category) => category.key === "skills");
  assert.equal(skillsCategory.score, 50);
});
