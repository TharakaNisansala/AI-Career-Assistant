const { findResumeById } = require("../services/resume.service");
const { findJobDescriptionById } = require("../services/jobDescription.service");
const { extractResumeText, ResumeFileMissingError } = require("../services/resumeExtraction.service");
const {
  EmptyDocumentError,
  CorruptedDocumentError,
  UnsupportedMimeTypeError,
  DocumentTooLargeError,
} = require("../utils/textExtraction.utils");
const { requestAiAnalysis } = require("../services/resumeAnalysis.service");
const { requestAiJobRequirements } = require("../services/jobMatch.service");
const {
  requestAiQuestions,
  requestAiAnswerEvaluation,
  createSession,
  listSessionsForUser,
  findSessionById,
  saveAnswer,
  listAnswersForSession,
} = require("../services/interviewPrep.service");
const { AIResponseValidationError } = require("../utils/analysisValidation");
const {
  validateAnswerSubmissionInput,
  validateTargetRole,
} = require("../utils/interviewValidation");
const {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
} = require("../services/ai/errors");
const { isValidUUID } = require("../utils/validators");

function serializeSession(session) {
  return {
    sessionId: session.session_id,
    resumeId: session.resume_id,
    jobId: session.job_id,
    targetRole: session.target_role,
    questions: session.questions,
    createdAt: session.created_at,
  };
}

function serializeAnswer(answer) {
  return {
    answerId: answer.answer_id,
    sessionId: answer.session_id,
    questionId: answer.question_id,
    questionText: answer.question_text,
    questionType: answer.question_type,
    answerText: answer.answer_text,
    score: answer.score,
    strengths: answer.strengths,
    weaknesses: answer.weaknesses,
    suggestions: answer.suggestions,
    createdAt: answer.created_at,
  };
}

// Mirrors resumeAnalysis.controller.js/jobMatch.controller.js's error
// cascade: interview prep goes through the same resume-extraction and AI
// transport/validation pipeline, so the same mapping to HTTP codes applies.
function handleInterviewError(error, res, fallbackMessage) {
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
    console.error("AI returned a malformed interview prep response:", error.message);
    return res.status(502).json({ status: "error", message: "AI service returned an invalid result" });
  }
  if (error instanceof AIProviderError) {
    console.error("AI provider error:", error.message);
    return res.status(502).json({ status: "error", message: "AI provider returned an error" });
  }

  console.error(fallbackMessage, error.message);
  res.status(500).json({ status: "error", message: fallbackMessage });
}

// Pipeline: verify ownership of the resume (and job description, if given)
// -> extract resume text -> ask the AI for resume facts (reusing
// resumeAnalysis.service.js) and, if a job was selected, job requirements
// (reusing jobMatch.service.js) -> ask the AI for interview questions built
// from that context -> persist -> return the stored session.
async function generateInterviewSession(req, res) {
  const { resumeId, jobId, targetRole } = req.body || {};

  if (!isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "A valid resumeId is required" });
  }
  if (jobId !== undefined && jobId !== null && jobId !== "" && !isValidUUID(jobId)) {
    return res.status(400).json({ status: "error", message: "Invalid job description id" });
  }

  const targetRoleError = validateTargetRole(targetRole);
  if (targetRoleError) {
    return res.status(400).json({ status: "error", message: targetRoleError });
  }

  try {
    const resume = await findResumeById(resumeId);
    // Same not-found-vs-not-yours ambiguity used elsewhere: both return 404.
    if (!resume || resume.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Resume not found" });
    }

    let job = null;
    if (jobId) {
      job = await findJobDescriptionById(jobId);
      if (!job || job.user_id !== req.user.userId) {
        return res.status(404).json({ status: "error", message: "Job description not found" });
      }
    }

    const resumeText = await extractResumeText(resume);
    const resumeFacts = await requestAiAnalysis(resumeText);
    const jobRequirements = job ? await requestAiJobRequirements(job.description) : null;
    const effectiveTargetRole =
      typeof targetRole === "string" && targetRole.trim() ? targetRole.trim() : job?.title || "";

    const questions = await requestAiQuestions({
      resumeFacts,
      targetRole: effectiveTargetRole,
      jobRequirements,
    });

    const session = await createSession({
      userId: req.user.userId,
      resumeId,
      jobId: job ? jobId : null,
      targetRole: effectiveTargetRole,
      questions,
    });

    res.status(201).json({
      status: "success",
      message: "Interview questions generated successfully",
      session: serializeSession(session),
    });
  } catch (error) {
    handleInterviewError(error, res, "Unable to generate interview questions");
  }
}

async function getInterviewSessions(req, res) {
  try {
    const sessions = await listSessionsForUser(req.user.userId);
    res.json({ status: "success", sessions: sessions.map(serializeSession) });
  } catch (error) {
    console.error("Fetching interview session history failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to fetch interview session history" });
  }
}

async function getInterviewSession(req, res) {
  const { sessionId } = req.params;

  if (!isValidUUID(sessionId)) {
    return res.status(400).json({ status: "error", message: "Invalid session id" });
  }

  try {
    const session = await findSessionById(sessionId);
    if (!session || session.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Interview session not found" });
    }

    const answers = await listAnswersForSession(sessionId);
    res.json({
      status: "success",
      session: serializeSession(session),
      answers: answers.map(serializeAnswer),
    });
  } catch (error) {
    console.error("Fetching interview session failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to fetch interview session" });
  }
}

// Pipeline: verify session ownership -> find the matching question within
// the session's stored questions -> ask the AI to evaluate the answer ->
// validate the response -> persist -> return the stored evaluation.
async function submitInterviewAnswer(req, res) {
  const { sessionId } = req.params;

  if (!isValidUUID(sessionId)) {
    return res.status(400).json({ status: "error", message: "Invalid session id" });
  }

  const errors = validateAnswerSubmissionInput(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ status: "error", message: errors[0], errors });
  }

  const { questionId, answerText } = req.body;

  try {
    const session = await findSessionById(sessionId);
    if (!session || session.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Interview session not found" });
    }

    const question = session.questions.find((q) => q.questionId === questionId);
    if (!question) {
      return res.status(404).json({ status: "error", message: "Question not found in this session" });
    }

    const trimmedAnswer = answerText.trim();
    const evaluation = await requestAiAnswerEvaluation({
      question: question.question,
      questionType: question.type,
      answerText: trimmedAnswer,
    });

    const answer = await saveAnswer({
      sessionId,
      questionId,
      questionText: question.question,
      questionType: question.type,
      answerText: trimmedAnswer,
      score: evaluation.score,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      suggestions: evaluation.suggestions,
    });

    res.status(201).json({
      status: "success",
      message: "Answer evaluated successfully",
      answer: serializeAnswer(answer),
    });
  } catch (error) {
    handleInterviewError(error, res, "Unable to evaluate interview answer");
  }
}

module.exports = {
  generateInterviewSession,
  getInterviewSessions,
  getInterviewSession,
  submitInterviewAnswer,
};
