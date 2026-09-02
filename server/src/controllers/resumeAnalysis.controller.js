const { findResumeById } = require("../services/resume.service");
const { extractResumeText } = require("../services/resumeExtraction.service");
const {
  requestAiAnalysis,
  saveAnalysis,
  listAnalysesForResume,
} = require("../services/resumeAnalysis.service");
const { calculateAtsScore } = require("../services/atsScoring.service");
const { isValidUUID } = require("../utils/validators");
const { assertOwned } = require("../utils/ownership");
const { handleControllerError } = require("../utils/controllerErrorHandling");
const { parsePagination, buildPaginationMeta } = require("../utils/pagination");

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

// Pipeline: verify ownership -> extract resume text -> ask the AI service
// for structured facts -> validate them -> score deterministically ->
// persist -> return the stored result.
async function analyzeResume(req, res) {
  const { resumeId } = req.params;

  if (!isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid resume id" });
  }

  try {
    const resume = assertOwned(await findResumeById(resumeId), req.user.userId, "Resume not found");

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
    handleControllerError(error, res, "Unable to analyze resume");
  }
}

async function getAnalysisHistory(req, res) {
  const { resumeId } = req.params;

  if (!isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid resume id" });
  }

  const { page, pageSize, limit, offset } = parsePagination(req.query);

  try {
    assertOwned(await findResumeById(resumeId), req.user.userId, "Resume not found");

    const { rows, totalItems } = await listAnalysesForResume(resumeId, { limit, offset });
    res.json({
      status: "success",
      analyses: rows.map(serializeAnalysis),
      pagination: buildPaginationMeta({ page, pageSize, totalItems }),
    });
  } catch (error) {
    handleControllerError(error, res, "Unable to fetch analysis history");
  }
}

module.exports = { analyzeResume, getAnalysisHistory, serializeAnalysis };
