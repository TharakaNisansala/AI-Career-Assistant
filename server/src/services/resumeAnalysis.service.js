const pool = require("../config/database");
const { getCompletion } = require("./ai.service");
const { validateAnalysisPayload } = require("../utils/analysisValidation");

const ANALYSIS_SYSTEM_PROMPT =
  "You are an expert resume reviewer and career coach. Extract structured facts " +
  "from the resume text you are given. Only report information that is actually " +
  "present in the resume -- do not invent skills, dates, or qualifications.";

function buildAnalysisUserPrompt(resumeText) {
  return `Analyze the following resume text and extract structured information as JSON with exactly these fields:
{
  "summary": "a 1-2 sentence professional summary of the candidate",
  "skills": ["skill1", "skill2"],
  "education": [{"degree": "...", "field": "...", "institution": "...", "graduationYear": "..."}],
  "experience": [{"title": "...", "company": "...", "startDate": "YYYY-MM or YYYY", "endDate": "YYYY-MM, YYYY, or Present", "description": "..."}],
  "strengths": ["strength1"],
  "weaknesses": ["weakness1"],
  "recommendations": ["actionable suggestion 1"]
}

When building the "skills" array, include every skill, tool, framework, language, or technology the
candidate has demonstrably used -- not only ones listed under an explicit "Skills" heading. In
particular, also read any "Projects" section and pull out technologies named in project descriptions
(for example, "Built a REST API using Node.js and PostgreSQL" should surface "Node.js" and "PostgreSQL"
as skills even though they only appear in a project description, not a Skills list). Merge everything
into the single "skills" array without duplicating a skill that's already captured elsewhere.

Resume text:
"""
${resumeText}
"""`;
}

// Calls the AI service for the resume's structured facts and validates the
// response before returning it. Scoring is intentionally not done here --
// see atsScoring.service.js, which turns these facts into the final score.
async function requestAiAnalysis(resumeText) {
  const result = await getCompletion({
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    userPrompt: buildAnalysisUserPrompt(resumeText),
    maxTokens: 2048,
    temperature: 0.3,
    responseFormat: "json",
  });

  return validateAnalysisPayload(result.parsedContent);
}

async function saveAnalysis({ resumeId, atsScore, breakdown, extracted }) {
  const result = await pool.query(
    `INSERT INTO resume_analyses
      (resume_id, ats_score, score_breakdown, summary, strengths, weaknesses, skills, education, experience, recommendations)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING analysis_id, resume_id, ats_score, score_breakdown, summary, strengths, weaknesses, skills, education, experience, recommendations, created_at`,
    [
      resumeId,
      atsScore,
      JSON.stringify(breakdown),
      extracted.summary,
      JSON.stringify(extracted.strengths),
      JSON.stringify(extracted.weaknesses),
      JSON.stringify(extracted.skills),
      JSON.stringify(extracted.education),
      JSON.stringify(extracted.experience),
      JSON.stringify(extracted.recommendations),
    ]
  );
  return result.rows[0];
}

async function listAnalysesForResume(resumeId, { limit, offset } = {}) {
  const result = await pool.query(
    `SELECT analysis_id, resume_id, ats_score, score_breakdown, summary, strengths, weaknesses, skills, education, experience, recommendations, created_at,
            COUNT(*) OVER() AS total_count
     FROM resume_analyses
     WHERE resume_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [resumeId, limit, offset]
  );
  const totalItems = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows.map(({ total_count, ...row }) => row), totalItems };
}

module.exports = { requestAiAnalysis, saveAnalysis, listAnalysesForResume };
