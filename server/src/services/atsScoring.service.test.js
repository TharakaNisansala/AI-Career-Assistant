const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateAtsScore } = require("./atsScoring.service");

const BASE_EXTRACTED = {
  summary: "",
  skills: [],
  education: [],
  experience: [],
  strengths: [],
  weaknesses: [],
  recommendations: [],
};

test("calculateAtsScore scores a completely empty resume very low", () => {
  const { overallScore, breakdown } = calculateAtsScore({ resumeText: "", extracted: BASE_EXTRACTED });
  assert.equal(breakdown.length, 6);

  // Categories with no facts to work from score 0 outright.
  for (const key of ["skills", "experience", "education", "keywords"]) {
    assert.equal(breakdown.find((category) => category.key === key).score, 0);
  }

  // Formatting/role-clarity keep a small structural baseline rather than
  // being strictly binary, so the overall score is very low but not exactly 0.
  assert.ok(overallScore < 10, `expected a very low overall score, got ${overallScore}`);
});

test("calculateAtsScore weights sum to 1", () => {
  const { breakdown } = calculateAtsScore({ resumeText: "", extracted: BASE_EXTRACTED });
  const totalWeight = breakdown.reduce((sum, category) => sum + category.weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9);
});

test("calculateAtsScore is deterministic for the same input", () => {
  const extracted = {
    ...BASE_EXTRACTED,
    skills: ["Node.js", "SQL"],
    experience: [{ title: "Engineer", company: "Acme", startDate: "2020-01", endDate: "2022-01" }],
  };
  const first = calculateAtsScore({ resumeText: "some resume text", extracted });
  const second = calculateAtsScore({ resumeText: "some resume text", extracted });
  assert.deepEqual(first, second);
});

test("calculateAtsScore rewards a strong, well-rounded resume", () => {
  const resumeText = `
    Jane Doe
    jane@example.com | 555-123-4567

    Summary
    Results-driven backend engineer.

    Experience
    - Managed and led a team, improved throughput by 40%, reduced latency by 25%.

    Education
    Bachelor of Science in Computer Science

    Skills
    Node.js, JavaScript, PostgreSQL, Express, Docker, AWS, REST APIs, Git, Testing, CI/CD, System Design, Microservices
  `;
  const extracted = {
    summary: "Results-driven backend engineer with 6 years of experience.",
    skills: [
      "Node.js", "JavaScript", "PostgreSQL", "Express", "Docker", "AWS",
      "REST APIs", "Git", "Testing", "CI/CD", "System Design", "Microservices",
    ],
    education: [{ degree: "Bachelor of Science in Computer Science", field: "", institution: "", graduationYear: "" }],
    experience: [{ title: "Senior Engineer", company: "Acme", startDate: "2018-01", endDate: "Present", description: "" }],
    strengths: [],
    weaknesses: [],
    recommendations: [],
  };

  const { overallScore, breakdown } = calculateAtsScore({ resumeText, extracted });
  assert.ok(overallScore > 70, `expected a high overall score, got ${overallScore}`);
  const byKey = Object.fromEntries(breakdown.map((category) => [category.key, category]));
  assert.ok(byKey.skills.score >= 90);
  assert.ok(byKey.education.score >= 70);
});

test("calculateAtsScore gives partial credit for experience entries with unparseable dates", () => {
  const extracted = {
    ...BASE_EXTRACTED,
    experience: [{ title: "Engineer", company: "Acme", startDate: "", endDate: "" }],
  };
  const { breakdown } = calculateAtsScore({ resumeText: "", extracted });
  const experienceCategory = breakdown.find((category) => category.key === "experience");
  assert.ok(experienceCategory.score > 0);
  assert.ok(experienceCategory.score < 100);
});

test("calculateAtsScore scores education by the highest degree found", () => {
  const extracted = {
    ...BASE_EXTRACTED,
    education: [
      { degree: "High School Diploma", field: "", institution: "", graduationYear: "" },
      { degree: "Master of Science in Data Science", field: "", institution: "", graduationYear: "" },
    ],
  };
  const { breakdown } = calculateAtsScore({ resumeText: "", extracted });
  const educationCategory = breakdown.find((category) => category.key === "education");
  assert.equal(educationCategory.score, 90);
});

test("calculateAtsScore rewards action verbs and quantified metrics as keywords", () => {
  const withMetrics = calculateAtsScore({
    resumeText: "Managed and led a team. Increased revenue by 30%. Reduced costs by 15%.",
    extracted: BASE_EXTRACTED,
  });
  const without = calculateAtsScore({ resumeText: "Was responsible for a team.", extracted: BASE_EXTRACTED });

  const withKeywordScore = withMetrics.breakdown.find((c) => c.key === "keywords").score;
  const withoutKeywordScore = without.breakdown.find((c) => c.key === "keywords").score;
  assert.ok(withKeywordScore > withoutKeywordScore);
});
