// Deterministic, explainable job-match scoring. The AI layer only extracts
// facts (resume skills/education/experience via resumeAnalysis.service.js,
// and job requirements via jobMatch.service.js); every number here is
// computed from those facts by the backend, so the same input always
// produces the same match percentage and each category comes with a
// plain-language reason for its value. Mirrors atsScoring.service.js.

const DEGREE_LEVELS = [
  { pattern: /doctor|ph\.?d/i, rank: 5, label: "Doctorate" },
  { pattern: /master/i, rank: 4, label: "Master's degree" },
  { pattern: /bachelor/i, rank: 3, label: "Bachelor's degree" },
  { pattern: /associate/i, rank: 2, label: "Associate degree" },
  { pattern: /diploma|certificat|high school|secondary/i, rank: 1, label: "Diploma/certificate/high school" },
];

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeSkill(skill) {
  return skill.toLowerCase().trim();
}

function skillsMatch(resumeSkill, targetSkill) {
  const a = normalizeSkill(resumeSkill);
  const b = normalizeSkill(targetSkill);
  return a === b || a.includes(b) || b.includes(a);
}

function findSkillMatches(resumeSkills, targetSkills) {
  const matched = [];
  const missing = [];
  for (const target of targetSkills) {
    if (resumeSkills.some((resumeSkill) => skillsMatch(resumeSkill, target))) {
      matched.push(target);
    } else {
      missing.push(target);
    }
  }
  return { matched, missing };
}

function scoreSkills(resumeSkills, requiredSkills, preferredSkills) {
  if (requiredSkills.length === 0 && preferredSkills.length === 0) {
    return {
      score: 50,
      explanation: "Job description did not specify explicit required or preferred skills, so this category defaults to a neutral score.",
      matched: [],
      missing: [],
    };
  }

  const requiredResult = findSkillMatches(resumeSkills, requiredSkills);
  const preferredResult = findSkillMatches(resumeSkills, preferredSkills);

  const requiredRatio = requiredSkills.length === 0 ? 1 : requiredResult.matched.length / requiredSkills.length;
  const preferredRatio = preferredSkills.length === 0 ? 1 : preferredResult.matched.length / preferredSkills.length;

  // Required skills weigh far more than preferred within this category.
  const score = clampScore(requiredRatio * 80 + preferredRatio * 20);

  return {
    score,
    explanation: `${requiredResult.matched.length}/${requiredSkills.length} required skill(s) and ${preferredResult.matched.length}/${preferredSkills.length} preferred skill(s) found on the resume.`,
    matched: [...requiredResult.matched, ...preferredResult.matched],
    missing: requiredResult.missing,
  };
}

function parseDateToMonthIndex(dateStr, now) {
  if (!dateStr) {
    return null;
  }
  if (/present|current|now/i.test(dateStr)) {
    return now.getFullYear() * 12 + now.getMonth();
  }
  const match = dateStr.match(/(\d{4})(?:[-/](\d{1,2}))?/);
  if (!match) {
    return null;
  }
  const year = parseInt(match[1], 10);
  const month = match[2] ? parseInt(match[2], 10) - 1 : 0;
  return year * 12 + month;
}

function calculateTotalExperienceYears(experience, now) {
  let totalMonths = 0;
  for (const entry of experience) {
    const start = parseDateToMonthIndex(entry.startDate, now);
    const end = parseDateToMonthIndex(entry.endDate, now);
    if (start !== null && end !== null && end > start) {
      totalMonths += end - start;
    }
  }
  return totalMonths / 12;
}

function scoreExperience(experience, minExperienceYears, now = new Date()) {
  const totalYears = calculateTotalExperienceYears(experience, now);

  if (minExperienceYears <= 0) {
    return {
      score: 100,
      explanation:
        totalYears > 0
          ? `Job description did not specify a minimum years-of-experience requirement; resume shows approximately ${totalYears.toFixed(1)} years.`
          : "Job description did not specify a minimum years-of-experience requirement.",
    };
  }

  if (totalYears <= 0) {
    return {
      score: 0,
      explanation: `Job requires approximately ${minExperienceYears} year(s) of experience, but no usable experience duration could be determined from the resume.`,
    };
  }

  const score = clampScore((Math.min(totalYears, minExperienceYears) / minExperienceYears) * 100);
  return {
    score,
    explanation: `Resume shows approximately ${totalYears.toFixed(1)} years of experience against a requirement of ${minExperienceYears} year(s).`,
  };
}

function degreeRank(text) {
  if (!text) {
    return 0;
  }
  const match = DEGREE_LEVELS.find((level) => level.pattern.test(text));
  return match ? match.rank : 0;
}

function scoreEducation(education, educationRequirement) {
  const requiredRank = degreeRank(educationRequirement);
  if (requiredRank === 0) {
    return { score: 100, explanation: "Job description did not specify a clear education requirement." };
  }

  const resumeRank = education.reduce((max, entry) => Math.max(max, degreeRank(entry.degree)), 0);
  if (resumeRank === 0) {
    return {
      score: 0,
      explanation: `Job requires ${educationRequirement}, but no matching education was found on the resume.`,
    };
  }

  const score = resumeRank >= requiredRank ? 100 : clampScore((resumeRank / requiredRank) * 100);
  return {
    score,
    explanation: `Job requires approximately a "${educationRequirement}" level qualification; the highest resume qualification ranks ${
      resumeRank >= requiredRank ? "at or above" : "below"
    } that level.`,
  };
}

function scoreKeywords(resumeText, keywords) {
  if (keywords.length === 0) {
    return { score: 50, explanation: "Job description did not yield distinct keywords to check for." };
  }

  const lowerText = resumeText.toLowerCase();
  const found = keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()));
  return {
    score: clampScore((found.length / keywords.length) * 100),
    explanation: `${found.length}/${keywords.length} job description keyword(s) found in the resume text.`,
  };
}

function scoreJobRelevance(resumeSkills, matchedSkillCount, totalJobSkills) {
  if (totalJobSkills === 0) {
    return { score: 50, explanation: "Not enough job requirement data to assess overall relevance." };
  }

  const overlapRatio = matchedSkillCount / totalJobSkills;
  const focusRatio = resumeSkills.length === 0 ? 0 : Math.min(matchedSkillCount / resumeSkills.length, 1);
  const score = clampScore(overlapRatio * 70 + focusRatio * 30);

  return {
    score,
    explanation: `${matchedSkillCount} of ${totalJobSkills} job-relevant skill(s) matched, representing ${
      resumeSkills.length === 0 ? 0 : Math.round((matchedSkillCount / resumeSkills.length) * 100)
    }% of the candidate's listed skills.`,
  };
}

function buildStrengths(categories, matchedSkills) {
  const strengths = [];
  if (matchedSkills.length > 0) {
    strengths.push(`Strong overlap on: ${matchedSkills.join(", ")}.`);
  }
  for (const category of categories) {
    if (category.score >= 80) {
      strengths.push(`${category.label} is well aligned: ${category.explanation}`);
    }
  }
  if (strengths.length === 0) {
    strengths.push("No strong alignment areas were identified for this job description.");
  }
  return strengths;
}

function buildRecommendations(categories, missingSkills) {
  const recommendations = [];
  if (missingSkills.length > 0) {
    recommendations.push(`Consider gaining or highlighting experience with: ${missingSkills.join(", ")}.`);
  }
  for (const category of categories) {
    if (category.score < 50 && category.key !== "skills") {
      recommendations.push(`Improve ${category.label.toLowerCase()} alignment: ${category.explanation}`);
    }
  }
  if (recommendations.length === 0) {
    recommendations.push("Resume is well aligned with this job description; no major gaps identified.");
  }
  return recommendations;
}

const CATEGORY_DEFINITIONS = [
  { key: "skills", label: "Required & Preferred Skills", weight: 0.4 },
  { key: "experience", label: "Experience", weight: 0.2 },
  { key: "education", label: "Education", weight: 0.15 },
  { key: "keywords", label: "Keywords", weight: 0.15 },
  { key: "jobRelevance", label: "Overall Job Relevance", weight: 0.1 },
];

// The single entry point for turning validated AI-extracted resume facts and
// job requirements into a final match result. Every category score, the
// overall weighted percentage, and the matched/missing skill lists are
// computed here in plain arithmetic -- the AI never supplies a percentage,
// a match/miss verdict, or a recommendation directly.
function calculateJobMatch({ resumeText, resumeFacts, jobRequirements }) {
  const skillsResult = scoreSkills(resumeFacts.skills, jobRequirements.requiredSkills, jobRequirements.preferredSkills);
  const experienceResult = scoreExperience(resumeFacts.experience, jobRequirements.minExperienceYears);
  const educationResult = scoreEducation(resumeFacts.education, jobRequirements.educationRequirement);
  const keywordsResult = scoreKeywords(resumeText, jobRequirements.keywords);
  const totalJobSkills = jobRequirements.requiredSkills.length + jobRequirements.preferredSkills.length;
  const jobRelevanceResult = scoreJobRelevance(resumeFacts.skills, skillsResult.matched.length, totalJobSkills);

  const resultsByKey = {
    skills: skillsResult,
    experience: experienceResult,
    education: educationResult,
    keywords: keywordsResult,
    jobRelevance: jobRelevanceResult,
  };

  const breakdown = CATEGORY_DEFINITIONS.map((definition) => {
    const { score, explanation } = resultsByKey[definition.key];
    return {
      key: definition.key,
      label: definition.label,
      weight: definition.weight,
      score,
      weightedScore: Math.round(score * definition.weight * 100) / 100,
      explanation,
    };
  });

  const matchPercentage = clampScore(breakdown.reduce((sum, category) => sum + category.score * category.weight, 0));

  return {
    matchPercentage,
    breakdown,
    matchedSkills: skillsResult.matched,
    missingSkills: skillsResult.missing,
    strengths: buildStrengths(breakdown, skillsResult.matched),
    recommendations: buildRecommendations(breakdown, skillsResult.missing),
  };
}

module.exports = { calculateJobMatch };
