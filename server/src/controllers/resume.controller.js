const {
  createResume,
  listResumesForUser,
  findResumeById,
  deleteResumeById,
} = require("../services/resume.service");
const {
  extractResumeText,
  ResumeFileMissingError,
} = require("../services/resumeExtraction.service");
const {
  EmptyDocumentError,
  CorruptedDocumentError,
  UnsupportedMimeTypeError,
} = require("../utils/textExtraction.utils");
const { isValidUUID } = require("../utils/validators");

function serializeResume(resume) {
  return {
    resumeId: resume.resume_id,
    fileName: resume.original_file_name,
    fileSize: resume.file_size,
    mimeType: resume.mime_type,
    uploadedAt: resume.uploaded_at,
  };
}

async function uploadResume(req, res) {
  if (!req.file) {
    return res.status(400).json({ status: "error", message: "A resume file is required" });
  }

  try {
    const resume = await createResume({ userId: req.user.userId, file: req.file });
    res.status(201).json({
      status: "success",
      message: "Resume uploaded successfully",
      resume: serializeResume(resume),
    });
  } catch (error) {
    console.error("Resume upload failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to upload resume" });
  }
}

async function listResumes(req, res) {
  try {
    const resumes = await listResumesForUser(req.user.userId);
    res.json({ status: "success", resumes: resumes.map(serializeResume) });
  } catch (error) {
    console.error("Listing resumes failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to fetch resumes" });
  }
}

async function getResumeText(req, res) {
  const { resumeId } = req.params;

  if (!isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid resume id" });
  }

  try {
    const resume = await findResumeById(resumeId);

    // Same not-found-vs-not-yours ambiguity as removeResume: both cases
    // return 404 so callers can't distinguish them.
    if (!resume || resume.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Resume not found" });
    }

    const text = await extractResumeText(resume);
    res.json({
      status: "success",
      resumeId: resume.resume_id,
      text,
      characterCount: text.length,
    });
  } catch (error) {
    if (error instanceof EmptyDocumentError || error instanceof CorruptedDocumentError) {
      return res.status(422).json({ status: "error", message: error.message });
    }
    if (error instanceof UnsupportedMimeTypeError) {
      return res.status(415).json({ status: "error", message: error.message });
    }
    if (error instanceof ResumeFileMissingError) {
      return res.status(404).json({ status: "error", message: error.message });
    }

    console.error("Resume text extraction failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to extract resume text" });
  }
}

async function removeResume(req, res) {
  const { resumeId } = req.params;

  if (!isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid resume id" });
  }

  try {
    const resume = await findResumeById(resumeId);

    // A resume that doesn't exist and one that belongs to someone else both
    // return 404, so callers can't distinguish "not found" from "not yours".
    if (!resume || resume.user_id !== req.user.userId) {
      return res.status(404).json({ status: "error", message: "Resume not found" });
    }

    await deleteResumeById(resumeId);
    res.json({ status: "success", message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Deleting resume failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to delete resume" });
  }
}

module.exports = { uploadResume, listResumes, getResumeText, removeResume };
