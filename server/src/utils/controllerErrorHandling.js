const {
  EmptyDocumentError,
  CorruptedDocumentError,
  UnsupportedMimeTypeError,
  DocumentTooLargeError,
} = require("./textExtraction.utils");
const { ResumeFileMissingError } = require("../services/resumeExtraction.service");
const { AIResponseValidationError } = require("./analysisValidation");
const {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
} = require("../services/ai/errors");
const { NotFoundError } = require("./httpErrors");

// Shared by every controller whose pipeline can fail at resource lookup,
// text extraction, or the AI call: resumeAnalysis, jobMatch, interviewPrep,
// and resume (getResumeText) all used to duplicate this exact cascade.
function handleControllerError(error, res, fallbackMessage) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ status: "error", message: error.message });
  }
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
    console.error("AI returned a malformed response:", error.message);
    return res.status(502).json({ status: "error", message: "AI service returned an invalid result" });
  }
  if (error instanceof AIProviderError) {
    console.error("AI provider error:", error.message);
    return res.status(502).json({ status: "error", message: "AI provider returned an error" });
  }

  console.error(fallbackMessage, error.message);
  res.status(500).json({ status: "error", message: fallbackMessage });
}

module.exports = { handleControllerError };
