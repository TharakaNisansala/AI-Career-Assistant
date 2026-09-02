const {
  createResume,
  listResumesForUser,
  findResumeById,
  deleteResumeById,
} = require("../services/resume.service");
const { extractResumeText } = require("../services/resumeExtraction.service");
const { isValidUUID } = require("../utils/validators");
const { assertOwned } = require("../utils/ownership");
const { handleControllerError } = require("../utils/controllerErrorHandling");
const { parsePagination, buildPaginationMeta } = require("../utils/pagination");

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
  const { page, pageSize, limit, offset } = parsePagination(req.query);

  try {
    const { rows, totalItems } = await listResumesForUser(req.user.userId, { limit, offset });
    res.json({
      status: "success",
      resumes: rows.map(serializeResume),
      pagination: buildPaginationMeta({ page, pageSize, totalItems }),
    });
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
    const resume = assertOwned(await findResumeById(resumeId), req.user.userId, "Resume not found");

    const text = await extractResumeText(resume);
    res.json({
      status: "success",
      resumeId: resume.resume_id,
      text,
      characterCount: text.length,
    });
  } catch (error) {
    handleControllerError(error, res, "Unable to extract resume text");
  }
}

async function removeResume(req, res) {
  const { resumeId } = req.params;

  if (!isValidUUID(resumeId)) {
    return res.status(400).json({ status: "error", message: "Invalid resume id" });
  }

  try {
    assertOwned(await findResumeById(resumeId), req.user.userId, "Resume not found");

    await deleteResumeById(resumeId);
    res.json({ status: "success", message: "Resume deleted successfully" });
  } catch (error) {
    handleControllerError(error, res, "Unable to delete resume");
  }
}

module.exports = { uploadResume, listResumes, getResumeText, removeResume };
