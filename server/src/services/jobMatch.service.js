const pool = require("../config/database");
const { getCompletion } = require("./ai.service");
const { validateJobRequirementsPayload } = require("../utils/jobMatchValidation");
const { validateSkillMatchPayload } = require("../utils/skillMatchValidation");

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

const SKILL_MATCH_SYSTEM_PROMPT =
  "You are an expert technical recruiter evaluating how well a candidate's overall skill set and " +
  "experience holistically covers a job's required and preferred skills. Reason about equivalent or " +
  "related technologies (for example React.js satisfies React), transferable skills, and seniority " +
  "implied by the candidate's experience -- do not require an exact string match for every skill. Only " +
  "report a skill as matched or partially covered if there is genuine, reasonable evidence for it in the " +
  "candidate's skills or experience; do not invent skills the candidate doesn't have.";

function buildSkillMatchUserPrompt({ resumeSkills, resumeExperience, requiredSkills, preferredSkills }) {
  const experienceSummary =
    resumeExperience
      .map(
        (entry) =>
          `- ${entry.title || "Unknown title"} at ${entry.company || "Unknown company"} (${
            entry.startDate || "?"
          } - ${entry.endDate || "?"}): ${entry.description || "No description provided."}`
      )
      .join("\n") || "No experience entries provided.";

  return `Evaluate this candidate's holistic skill fit against a job's required and preferred skills.

Candidate's listed skills:
${resumeSkills.length > 0 ? resumeSkills.join(", ") : "None listed."}

Candidate's experience:
${experienceSummary}

Job's required skills:
${requiredSkills.length > 0 ? requiredSkills.join(", ") : "None specified."}

Job's preferred skills:
${preferredSkills.length > 0 ? preferredSkills.join(", ") : "None specified."}

Return structured JSON with exactly these fields:
{
  "skillMatchScore": 0,
  "matchedSkills": ["required or preferred skill names the candidate genuinely satisfies, either exactly or via a clearly equivalent technology"],
  "partiallyCoveredSkills": [{"requiredSkill": "the job's skill name", "coveredBy": "the candidate's related/equivalent skill or experience", "note": "a short explanation of why this reasonably transfers"}],
  "missingSkills": ["required or preferred skill names with no reasonable equivalent in the candidate's background"],
  "overallAssessment": "a short holistic assessment of the candidate's overall fit against these skills, covering seniority and transferable experience"
}

Every skill name in "matchedSkills", "partiallyCoveredSkills", and "missingSkills" must be one of the job's required or preferred skills listed above -- do not invent new skill names, and do not list the same skill in more than one of those three fields.`;
}

// Calls the AI service to holistically evaluate the candidate's skill fit --
// reasoning about equivalent/related technologies and transferable
// experience rather than the naive substring matching this replaces -- and
// validates the response before returning it. The AI supplies this one
// category's score plus which required/preferred skills are matched,
// partially covered, or genuinely missing; jobMatchScoring.service.js still
// composes the final weighted match percentage deterministically from this
// and the other category scores.
async function requestAiSkillMatch({ resumeSkills, resumeExperience, requiredSkills, preferredSkills }) {
  const result = await getCompletion({
    systemPrompt: SKILL_MATCH_SYSTEM_PROMPT,
    userPrompt: buildSkillMatchUserPrompt({ resumeSkills, resumeExperience, requiredSkills, preferredSkills }),
    maxTokens: 1024,
    temperature: 0.2,
    responseFormat: "json",
  });

  return validateSkillMatchPayload(result.parsedContent);
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

module.exports = { requestAiJobRequirements, requestAiSkillMatch, saveJobMatch, listJobMatches };
