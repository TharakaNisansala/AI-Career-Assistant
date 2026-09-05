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

function skillMatchResult(overrides) {
  return {
    skillMatchScore: 0,
    matchedSkills: [],
    partiallyCoveredSkills: [],
    missingSkills: [],
    overallAssessment: "",
    ...overrides,
  };
}

test("calculateJobMatch weights sum to 1", () => {
  const { breakdown } = calculateJobMatch({
    resumeText: "",
    resumeFacts: BASE_RESUME_FACTS,
    jobRequirements: BASE_JOB_REQUIREMENTS,
    skillMatchResult: null,
  });
  const totalWeight = breakdown.reduce((sum, category) => sum + category.weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9);
});

test("calculateJobMatch is deterministic for the same input", () => {
  const resumeFacts = { ...BASE_RESUME_FACTS, skills: ["Node.js", "SQL"] };
  const jobRequirements = { ...BASE_JOB_REQUIREMENTS, requiredSkills: ["Node.js"] };
  const aiSkillMatch = skillMatchResult({ skillMatchScore: 100, matchedSkills: ["Node.js"] });
  const first = calculateJobMatch({ resumeText: "some resume text", resumeFacts, jobRequirements, skillMatchResult: aiSkillMatch });
  const second = calculateJobMatch({ resumeText: "some resume text", resumeFacts, jobRequirements, skillMatchResult: aiSkillMatch });
  assert.deepEqual(first, second);
});

test("calculateJobMatch scores a strong candidate highly using the AI's holistic skill evaluation", () => {
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
  const aiSkillMatch = skillMatchResult({
    skillMatchScore: 100,
    matchedSkills: ["Node.js", "PostgreSQL", "Docker", "AWS"],
    overallAssessment: "Strong direct match on every required and preferred skill.",
  });

  const { matchPercentage, matchedSkills, missingSkills, strengths, recommendations } = calculateJobMatch({
    resumeText,
    resumeFacts,
    jobRequirements,
    skillMatchResult: aiSkillMatch,
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
  const aiSkillMatch = skillMatchResult({
    skillMatchScore: 0,
    missingSkills: ["Node.js", "PostgreSQL", "Docker", "AWS"],
    overallAssessment: "No relevant backend skills or transferable experience found.",
  });

  const { matchPercentage, matchedSkills, missingSkills, recommendations } = calculateJobMatch({
    resumeText,
    resumeFacts,
    jobRequirements,
    skillMatchResult: aiSkillMatch,
  });

  assert.ok(matchPercentage < 30, `expected a low match percentage, got ${matchPercentage}`);
  assert.deepEqual(matchedSkills, []);
  assert.ok(missingSkills.includes("Node.js"));
  assert.ok(missingSkills.includes("PostgreSQL"));
  assert.ok(missingSkills.includes("Docker"));
  assert.ok(recommendations.some((rec) => rec.includes("Node.js")));
});

test("calculateJobMatch surfaces partially-covered skills separately from genuine misses, with the AI's note", () => {
  const resumeFacts = { ...BASE_RESUME_FACTS, skills: ["Node.js", "MongoDB"] };
  const jobRequirements = { ...BASE_JOB_REQUIREMENTS, requiredSkills: ["Node.js", "PostgreSQL", "GraphQL"] };
  const aiSkillMatch = skillMatchResult({
    skillMatchScore: 55,
    matchedSkills: ["Node.js"],
    partiallyCoveredSkills: [
      {
        requiredSkill: "GraphQL",
        coveredBy: "MongoDB",
        note: "Experience with a flexible query-oriented data layer transfers reasonably well to GraphQL API design.",
      },
    ],
    missingSkills: ["PostgreSQL"],
  });

  const { matchedSkills, missingSkills, recommendations } = calculateJobMatch({
    resumeText: "",
    resumeFacts,
    jobRequirements,
    skillMatchResult: aiSkillMatch,
  });

  assert.deepEqual(matchedSkills, ["Node.js", "GraphQL (via MongoDB)"]);
  assert.deepEqual(missingSkills, ["PostgreSQL"]);
  assert.ok(recommendations.some((rec) => rec.includes("GraphQL") && rec.includes("MongoDB")));
  assert.ok(recommendations.some((rec) => rec.includes("PostgreSQL")));
});

test("calculateJobMatch defaults to a neutral skills score when the job specifies no skills", () => {
  const resumeFacts = { ...BASE_RESUME_FACTS, skills: ["Node.js"] };
  const { breakdown } = calculateJobMatch({
    resumeText: "",
    resumeFacts,
    jobRequirements: BASE_JOB_REQUIREMENTS,
    skillMatchResult: null,
  });
  const skillsCategory = breakdown.find((category) => category.key === "skills");
  assert.equal(skillsCategory.score, 50);
});
