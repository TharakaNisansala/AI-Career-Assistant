// Deterministic, explainable ATS scoring. The AI layer only extracts facts
// (skills/education/experience/etc. -- see resumeAnalysis.service.js); every
// number here is computed from those facts and the raw resume text by the
// backend, so the same input always produces the same score and each
// category comes with a plain-language reason for its value.

const DEGREE_LEVELS = [
  { pattern: /doctor|ph\.?d/i, score: 100, label: "Doctorate" },
  { pattern: /master/i, score: 90, label: "Master's degree" },
  { pattern: /bachelor/i, score: 75, label: "Bachelor's degree" },
  { pattern: /associate/i, score: 60, label: "Associate degree" },
  { pattern: /diploma|certificat/i, score: 50, label: "Diploma or certificate" },
  { pattern: /high school|secondary/i, score: 35, label: "High school diploma" },
];
const DEFAULT_DEGREE = { score: 25, label: "Unspecified qualification" };

const SKILLS_TARGET_COUNT = 12;
const EXPERIENCE_TARGET_YEARS = 8;

const ACTION_VERBS = [
  "managed", "led", "developed", "implemented", "designed", "created", "built",
  "architected", "improved", "increased", "reduced", "optimized", "launched",
  "delivered", "coordinated", "analyzed", "collaborated", "achieved", "automated",
  "streamlined", "mentored", "negotiated", "spearheaded", "executed", "established",
];

const EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_REGEX = /(\+?\d[\d\s().-]{7,}\d)/;
const SECTION_HEADERS = ["experience", "education", "skills", "summary", "objective", "projects", "certifications"];
const BULLET_REGEX = /^[ \t]*[•\-*▪●]/m;

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function degreeLevel(degreeText) {
  const match = DEGREE_LEVELS.find((level) => level.pattern.test(degreeText));
  return match || DEFAULT_DEGREE;
}

function scoreSkills(skills) {
  if (skills.length === 0) {
    return { score: 0, explanation: "No skills were identified on the resume." };
  }
  const score = clampScore((Math.min(skills.length, SKILLS_TARGET_COUNT) / SKILLS_TARGET_COUNT) * 100);
  return {
    score,
    explanation: `${skills.length} distinct skill${skills.length === 1 ? "" : "s"} identified (target: ${SKILLS_TARGET_COUNT}+ for a full score).`,
  };
}

function scoreEducation(education) {
  if (education.length === 0) {
    return { score: 0, explanation: "No education entries were found on the resume." };
  }
  const best = education.map((entry) => degreeLevel(entry.degree)).sort((a, b) => b.score - a.score)[0];
  return {
    score: clampScore(best.score),
    explanation: `Highest qualification detected: ${best.label} (${education.length} education ${education.length === 1 ? "entry" : "entries"} found).`,
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

function scoreExperience(experience, now = new Date()) {
  if (experience.length === 0) {
    return { score: 0, explanation: "No work experience entries were found on the resume." };
  }

  let totalMonths = 0;
  for (const entry of experience) {
    const start = parseDateToMonthIndex(entry.startDate, now);
    const end = parseDateToMonthIndex(entry.endDate, now);
    if (start !== null && end !== null && end > start) {
      totalMonths += end - start;
    }
  }

  if (totalMonths <= 0) {
    const score = clampScore(Math.min(experience.length * 15, 60));
    return {
      score,
      explanation: `${experience.length} position(s) found but dates could not be determined, so this category was scored on position count alone.`,
    };
  }

  const totalYears = totalMonths / 12;
  const score = clampScore((Math.min(totalYears, EXPERIENCE_TARGET_YEARS) / EXPERIENCE_TARGET_YEARS) * 100);
  return {
    score,
    explanation: `${experience.length} position${experience.length === 1 ? "" : "s"} found totaling approximately ${totalYears.toFixed(1)} years of experience (target: ${EXPERIENCE_TARGET_YEARS}+ years for a full score).`,
  };
}

function scoreKeywords(resumeText) {
  const lowerText = resumeText.toLowerCase();
  const actionVerbMatches = ACTION_VERBS.filter((verb) => lowerText.includes(verb));
  const quantifiedMatches = resumeText.match(/\b\d+(\.\d+)?%?\b/g) || [];

  const actionVerbScore = (Math.min(actionVerbMatches.length, 8) / 8) * 60;
  const quantifiedScore = (Math.min(quantifiedMatches.length, 6) / 6) * 40;

  return {
    score: clampScore(actionVerbScore + quantifiedScore),
    explanation: `Found ${actionVerbMatches.length} strong action verb${actionVerbMatches.length === 1 ? "" : "s"} and ${quantifiedMatches.length} quantified metric${quantifiedMatches.length === 1 ? "" : "s"} (numbers/percentages) in the resume text.`,
  };
}

function scoreFormatting(resumeText) {
  const wordCount = resumeText.trim().length === 0 ? 0 : resumeText.trim().split(/\s+/).length;
  const hasEmail = EMAIL_REGEX.test(resumeText);
  const hasPhone = PHONE_REGEX.test(resumeText);
  const lowerText = resumeText.toLowerCase();
  const sectionsFound = SECTION_HEADERS.filter((header) => lowerText.includes(header));
  const hasBullets = BULLET_REGEX.test(resumeText);

  const contactScore = ((hasEmail ? 1 : 0) + (hasPhone ? 1 : 0)) * 50;
  const sectionScore = (Math.min(sectionsFound.length, 4) / 4) * 100;
  const lengthScore = wordCount === 0 ? 0 : wordCount >= 250 && wordCount <= 1200 ? 100 : 50;
  const bulletScore = hasBullets ? 100 : 50;

  const score = contactScore * 0.3 + sectionScore * 0.35 + lengthScore * 0.2 + bulletScore * 0.15;

  return {
    score: clampScore(score),
    explanation: `Resume has ${wordCount} words, ${hasEmail ? "includes" : "is missing"} an email, ${hasPhone ? "includes" : "is missing"} a phone number, ${sectionsFound.length} recognizable section header(s), and ${hasBullets ? "uses" : "does not use"} bullet points.`,
  };
}

function scoreJobRelevance(resumeText, extracted) {
  const hasSummarySection = /\b(summary|objective|profile)\b/i.test(resumeText);
  const hasAiSummary = extracted.summary.length >= 20;
  const skillCount = extracted.skills.length;

  const focusScore = skillCount === 0 ? 0 : skillCount <= 20 ? 100 : Math.max(100 - (skillCount - 20) * 5, 40);
  const summaryScore = hasSummarySection || hasAiSummary ? 100 : 30;
  const score = summaryScore * 0.6 + focusScore * 0.4;

  return {
    score: clampScore(score),
    explanation: `${hasSummarySection || hasAiSummary ? "A clear summary/objective was found" : "No clear summary or objective section was found"}, and the resume lists ${skillCount} skill${skillCount === 1 ? "" : "s"}, which ${skillCount > 20 ? "may read as unfocused for a single target role" : "keeps the resume reasonably focused"}.`,
  };
}

const CATEGORY_DEFINITIONS = [
  { key: "skills", label: "Skills", weight: 0.2, calculate: (ctx) => scoreSkills(ctx.extracted.skills) },
  { key: "experience", label: "Experience", weight: 0.2, calculate: (ctx) => scoreExperience(ctx.extracted.experience) },
  { key: "education", label: "Education", weight: 0.15, calculate: (ctx) => scoreEducation(ctx.extracted.education) },
  { key: "keywords", label: "Keywords", weight: 0.2, calculate: (ctx) => scoreKeywords(ctx.resumeText) },
  { key: "formatting", label: "Formatting & Readability", weight: 0.15, calculate: (ctx) => scoreFormatting(ctx.resumeText) },
  { key: "jobRelevance", label: "Role Clarity", weight: 0.1, calculate: (ctx) => scoreJobRelevance(ctx.resumeText, ctx.extracted) },
];

// The single entry point for turning validated AI-extracted facts plus the
// raw resume text into a final ATS score. Every category score and the
// overall weighted total are computed here, in plain arithmetic -- the AI
// never supplies a number directly.
function calculateAtsScore({ resumeText, extracted }) {
  const ctx = { resumeText, extracted };

  const breakdown = CATEGORY_DEFINITIONS.map((definition) => {
    const { score, explanation } = definition.calculate(ctx);
    return {
      key: definition.key,
      label: definition.label,
      weight: definition.weight,
      score,
      weightedScore: Math.round(score * definition.weight * 100) / 100,
      explanation,
    };
  });

  const overallScore = clampScore(breakdown.reduce((sum, category) => sum + category.score * category.weight, 0));

  return { overallScore, breakdown };
}

module.exports = { calculateAtsScore };
