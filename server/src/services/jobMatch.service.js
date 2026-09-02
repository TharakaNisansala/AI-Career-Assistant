const pool = require("../config/database");
const { getCompletion } = require("./ai.service");
const { validateJobRequirementsPayload } = require("../utils/jobMatchValidation");

const JOB_REQUIREMENTS_SYSTEM_PROMPT =
  "You are an expert technical recruiter. Extract structured hiring requirements " +
  "from the job description text you are given. Only report requirements that are " +
  "actually stated or clearly implied in the text -- do not invent skills or requirements.";

function buildJobRequirementsUserPrompt(jobDescriptionText) {
  return `Analyze the following job description and extract structured hiring requirements as JSON with exactly these fields:
{
  "requiredSkills": ["skill1", "skill2"],
  "preferredSkills": ["skill1"],
  "minExperienceYears": 0,
  "educationRequirement": "e.g. Bachelor's degree in Computer Science, or empty string if not specified",
  "keywords": ["keyword1", "keyword2"]
}

Job description:
"""
${jobDescriptionText}
"""`;
}

// Calls the AI service for the job description's structured requirements and
// validates the response before returning it. Resume facts for the other
// side of the comparison are extracted by reusing requestAiAnalysis from
// resumeAnalysis.service.js, not duplicated here. Scoring itself happens in
// jobMatchScoring.service.js, which turns both sets of facts into the match
// result -- the AI never returns a match percentage directly.
async function requestAiJobRequirements(jobDescriptionText) {
  const result = await getCompletion({
    systemPrompt: JOB_REQUIREMENTS_SYSTEM_PROMPT,
    userPrompt: buildJobRequirementsUserPrompt(jobDescriptionText),
    maxTokens: 1024,
    temperature: 0.2,
    responseFormat: "json",
  });

  return validateJobRequirementsPayload(result.parsedContent);
}

async function saveJobMatch({
  jobId,
  resumeId,
  matchPercentage,
  breakdown,
  matchedSkills,
  missingSkills,
  strengths,
  recommendations,
}) {
  const result = await pool.query(
    `INSERT INTO job_matches
      (job_id, resume_id, match_percentage, score_breakdown, matched_skills, missing_skills, strengths, recommendations)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING match_id, job_id, resume_id, match_percentage, score_breakdown, matched_skills, missing_skills, strengths, recommendations, created_at`,
    [
      jobId,
      resumeId,
      matchPercentage,
      JSON.stringify(breakdown),
      JSON.stringify(matchedSkills),
      JSON.stringify(missingSkills),
      JSON.stringify(strengths),
      JSON.stringify(recommendations),
    ]
  );
  return result.rows[0];
}

async function listJobMatches({ jobId, resumeId, limit, offset }) {
  const result = await pool.query(
    `SELECT match_id, job_id, resume_id, match_percentage, score_breakdown, matched_skills, missing_skills, strengths, recommendations, created_at,
            COUNT(*) OVER() AS total_count
     FROM job_matches
     WHERE job_id = $1 AND resume_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [jobId, resumeId, limit, offset]
  );
  const totalItems = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows.map(({ total_count, ...row }) => row), totalItems };
}

module.exports = { requestAiJobRequirements, saveJobMatch, listJobMatches };
