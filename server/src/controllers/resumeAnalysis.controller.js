const { findResumeById } = require("../services/resume.service");
const { extractResumeText, ResumeFileMissingError } = require("../services/resumeExtraction.service");
const {
  EmptyDocumentError,
  CorruptedDocumentError,
  UnsupportedMimeTypeError,
} = require("../utils/textExtraction.utils");
const {
  requestAiAnalysis,
  saveAnalysis,
  listAnalysesForResume,
} = require("../services/resumeAnalysis.service");
const { calculateAtsScore } = require("../services/atsScoring.service");
const { AIResponseValidationError } = require("../utils/analysisValidation");
const {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
} = require("../services/ai/errors");
const { isValidUUID } = require("../utils/validators");

function serializeAnalysis(analysis) {
  return {
    analysisId: analysis.analysis_id,
    resumeId: analysis.resume_id,
    atsScore: analysis.ats_score,
    scoreBreakdown: analysis.score_breakdown,
    summary: analysis.summary,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    skills: analysis.skills,
    education: analysis.education,
    experience: analysis.experience,
    recommendations: analysis.recommendations,
    createdAt: analysis.created_at,
  };
}

function handleAnalysisError(error, res, fallbackMessage) {
  if (error instanceof EmptyDocumentError || error instanceof CorruptedDocumentError) {
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
    console.error("AI returned a malformed analysis response:", error.message);
    return res.status(502).json({ status: "error", message: "AI service returned an invalid analysis" });
  }
  if (error instanceof AIProviderError) {
    console.error("AI provider error:", error.message);
    return res.status(502).json({ status: "error", message: "AI provider returned an error" });
  }

  console.error(fallbackMessage, error.message);
  res.status(500).json({ status: "error", message: fallbackMessage });
}

// Pipeline: verify ownership -> extract resume text -> ask the AI service
// for structured facts -> validate them -> score deterministically ->
// persist -> return the stored result.
async function analyzeResume(req, res) {
  const { resumeId } = req.params;

  if (!isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid resume id" });
  }

  try {
    const resume = await findResumeById(resumeId);

    // Same not-found-vs-not-yours ambiguity used elsewhere: both return 404.
    if (!resume || resume.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Resume not found" });
    }

    const resumeText = await extractResumeText(resume);
    const extracted = await requestAiAnalysis(resumeText);
    const { overallScore, breakdown } = calculateAtsScore({ resumeText, extracted });
    const analysis = await saveAnalysis({
      resumeId,
      atsScore: overallScore,
      breakdown,
      extracted,
    });

    res.status(201).json({
      status: "success",
      message: "Resume analyzed successfully",
      analysis: serializeAnalysis(analysis),
    });
  } catch (error) {
    handleAnalysisError(error, res, "Unable to analyze resume");
  }
}

async function getAnalysisHistory(req, res) {
  const { resumeId } = req.params;

  if (!isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid resume id" });
  }

  try {
    const resume = await findResumeById(resumeId);

    if (!resume || resume.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Resume not found" });
    }

    const analyses = await listAnalysesForResume(resumeId);
    res.json({ status: "success", analyses: analyses.map(serializeAnalysis) });
  } catch (error) {
    console.error("Fetching analysis history failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to fetch analysis history" });
  }
}

module.exports = { analyzeResume, getAnalysisHistory };
