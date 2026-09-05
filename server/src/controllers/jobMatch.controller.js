const { findJobDescriptionById } = require("../services/jobDescription.service");
const { findResumeById } = require("../services/resume.service");
const { extractResumeText } = require("../services/resumeExtraction.service");
const { requestAiAnalysis } = require("../services/resumeAnalysis.service");
const { requestAiJobRequirements, requestAiSkillMatch, saveJobMatch, listJobMatches } = require("../services/jobMatch.service");
const { calculateJobMatch } = require("../services/jobMatchScoring.service");
const { isValidUUID } = require("../utils/validators");
const { assertOwned } = require("../utils/ownership");
const { handleControllerError } = require("../utils/controllerErrorHandling");
const { parsePagination, buildPaginationMeta } = require("../utils/pagination");

function serializeJobMatch(match) {
  return {
    matchId: match.match_id,
    jobId: match.job_id,
    resumeId: match.resume_id,
    matchPercentage: match.match_percentage,
    scoreBreakdown: match.score_breakdown,
    matchedSkills: match.matched_skills,
    missingSkills: match.missing_skills,
    strengths: match.strengths,
    recommendations: match.recommendations,
    createdAt: match.created_at,
  };
}

// Pipeline: verify ownership of both the job description and the resume ->
// extract resume text -> ask the AI service for structured resume facts
// (reusing resumeAnalysis.service.js) and job requirements -> if the job
// specifies any required/preferred skills, ask the AI for a holistic
// skill-fit evaluation between the two -> score deterministically -> persist
// -> return the stored result.
async function matchResumeToJob(req, res) {
  const { jobId, resumeId } = req.params;

  if (!isValidUUID(jobId) || !isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid job description or resume id" });
  }

  try {
    const job = assertOwned(await findJobDescriptionById(jobId), req.user.userId, "Job description not found");
    const resume = assertOwned(await findResumeById(resumeId), req.user.userId, "Resume not found");

    const resumeText = await extractResumeText(resume);
    const resumeFacts = await requestAiAnalysis(resumeText);
    const jobRequirements = await requestAiJobRequirements(job.description);

    const hasJobSkills = jobRequirements.requiredSkills.length > 0 || jobRequirements.preferredSkills.length > 0;
    const skillMatchResult = hasJobSkills
      ? await requestAiSkillMatch({
          resumeSkills: resumeFacts.skills,
          resumeExperience: resumeFacts.experience,
          requiredSkills: jobRequirements.requiredSkills,
          preferredSkills: jobRequirements.preferredSkills,
        })
      : null;

    const { matchPercentage, breakdown, matchedSkills, missingSkills, strengths, recommendations } =
      calculateJobMatch({ resumeText, resumeFacts, jobRequirements, skillMatchResult });

    const match = await saveJobMatch({
      jobId,
      resumeId,
      matchPercentage,
      breakdown,
      matchedSkills,
      missingSkills,
      strengths,
      recommendations,
    });

    res.status(201).json({
      status: "success",
      message: "Resume matched against job description successfully",
      match: serializeJobMatch(match),
    });
  } catch (error) {
    handleControllerError(error, res, "Unable to match resume against job description");
  }
}

async function getJobMatchHistory(req, res) {
  const { jobId, resumeId } = req.params;

  if (!isValidUUID(jobId) || !isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid job description or resume id" });
  }

  const { page, pageSize, limit, offset } = parsePagination(req.query);

  try {
    assertOwned(await findJobDescriptionById(jobId), req.user.userId, "Job description not found");
    assertOwned(await findResumeById(resumeId), req.user.userId, "Resume not found");

    const { rows, totalItems } = await listJobMatches({ jobId, resumeId, limit, offset });
    res.json({
      status: "success",
      matches: rows.map(serializeJobMatch),
      pagination: buildPaginationMeta({ page, pageSize, totalItems }),
    });
  } catch (error) {
    handleControllerError(error, res, "Unable to fetch job match history");
  }
}

module.exports = { matchResumeToJob, getJobMatchHistory, serializeJobMatch };
