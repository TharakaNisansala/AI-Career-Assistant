const { findJobDescriptionById } = require("../services/jobDescription.service");
const { findResumeById } = require("../services/resume.service");
const { extractResumeText, ResumeFileMissingError } = require("../services/resumeExtraction.service");
const {
  EmptyDocumentError,
  CorruptedDocumentError,
  UnsupportedMimeTypeError,
  DocumentTooLargeError,
} = require("../utils/textExtraction.utils");
const { requestAiAnalysis } = require("../services/resumeAnalysis.service");
const { requestAiJobRequirements, saveJobMatch, listJobMatches } = require("../services/jobMatch.service");
const { calculateJobMatch } = require("../services/jobMatchScoring.service");
const { AIResponseValidationError } = require("../utils/analysisValidation");
const {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
} = require("../services/ai/errors");
const { isValidUUID } = require("../utils/validators");

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

// Mirrors resumeAnalysis.controller.js's handleAnalysisError: maps the same
// resume-extraction and AI transport/validation error cascade to HTTP codes,
// since matching goes through both of those pipelines.
function handleJobMatchError(error, res, fallbackMessage) {
  if (
    error instanceof EmptyDocumentError ||
    error instanceof CorruptedDocumentError ||
    error instanceof DocumentTooLargeError
  ) {
    return res.status(422).json({ status: "error", message: error.message });
  }
  if (error instanceof UnsupportedMimeTypeError) {
    return res.status(415).json({ status: "error", message: error.message });
  }
  if (error instanceof ResumeFileMissingError) {
    return res.status(404).json({ status: "error", message: error.message });
  }
  if (error instanceof AIConfigurationError) {
    console.error("AI service misconfigured:", error.message);
    return res.status(500).json({ status: "error", message: "AI service is not configured" });
  }
  if (error instanceof AITimeoutError) {
    return res.status(504).json({ status: "error", message: "AI service request timed out" });
  }
  if (error instanceof AIRateLimitError) {
    return res
      .status(429)
      .json({ status: "error", message: "AI service rate limit exceeded, please retry later" });
  }
  if (error instanceof AIResponseValidationError) {
    console.error("AI returned a malformed job match response:", error.message);
    return res.status(502).json({ status: "error", message: "AI service returned an invalid result" });
  }
  if (error instanceof AIProviderError) {
    console.error("AI provider error:", error.message);
    return res.status(502).json({ status: "error", message: "AI provider returned an error" });
  }

  console.error(fallbackMessage, error.message);
  res.status(500).json({ status: "error", message: fallbackMessage });
}

// Pipeline: verify ownership of both the job description and the resume ->
// extract resume text -> ask the AI service for structured resume facts
// (reusing resumeAnalysis.service.js) and job requirements -> score
// deterministically -> persist -> return the stored result.
async function matchResumeToJob(req, res) {
  const { jobId, resumeId } = req.params;

  if (!isValidUUID(jobId) || !isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid job description or resume id" });
  }

  try {
    const job = await findJobDescriptionById(jobId);

    // Same not-found-vs-not-yours ambiguity used elsewhere: both return 404.
    if (!job || job.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Job description not found" });
    }

    const resume = await findResumeById(resumeId);
    if (!resume || resume.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Resume not found" });
    }

    const resumeText = await extractResumeText(resume);
    const resumeFacts = await requestAiAnalysis(resumeText);
    const jobRequirements = await requestAiJobRequirements(job.description);

    const { matchPercentage, breakdown, matchedSkills, missingSkills, strengths, recommendations } =
      calculateJobMatch({ resumeText, resumeFacts, jobRequirements });

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
    handleJobMatchError(error, res, "Unable to match resume against job description");
  }
}

async function getJobMatchHistory(req, res) {
  const { jobId, resumeId } = req.params;

  if (!isValidUUID(jobId) || !isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid job description or resume id" });
  }

  try {
    const job = await findJobDescriptionById(jobId);
    if (!job || job.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Job description not found" });
    }

    const resume = await findResumeById(resumeId);
    if (!resume || resume.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Resume not found" });
    }

    const matches = await listJobMatches({ jobId, resumeId });
    res.json({ status: "success", matches: matches.map(serializeJobMatch) });
  } catch (error) {
    console.error("Fetching job match history failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to fetch job match history" });
  }
}

module.exports = { matchResumeToJob, getJobMatchHistory };
