const multer = require("multer");
const path = require("path");

const MAX_RESUME_FILE_SIZE_MB = Number(process.env.MAX_RESUME_FILE_SIZE_MB) || 5;
const MAX_RESUME_FILE_SIZE_BYTES = MAX_RESUME_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx"]);

class UnsupportedFileTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedFileTypeError";
  }
}

// Checked separately from multer's storage engine so it can be unit-tested
// without going through an HTTP request.
function resumeFileFilter(req, file, cb) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const hasAllowedMimeType = ALLOWED_MIME_TYPES.has(file.mimetype);
  const hasAllowedExtension = ALLOWED_EXTENSIONS.has(extension);

  if (!hasAllowedMimeType || !hasAllowedExtension) {
    return cb(new UnsupportedFileTypeError("Only PDF and DOCX files are allowed"));
  }

  cb(null, true);
}

// memoryStorage keeps multer decoupled from the local filesystem: the buffer
// it produces is handed to whatever storage driver is currently active, so
// swapping to a cloud driver later needs no change here.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_FILE_SIZE_BYTES, files: 1 },
  fileFilter: resumeFileFilter,
});

function uploadResumeFile(req, res, next) {
  upload.single("resume")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          status: "error",
          message: `File is too large. Maximum size is ${MAX_RESUME_FILE_SIZE_MB}MB`,
        });
      }
      return res.status(400).json({ status: "error", message: error.message });
    }

    if (error instanceof UnsupportedFileTypeError) {
      return res.status(400).json({ status: "error", message: error.message });
    }

    console.error("Resume upload middleware failed:", error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Unable to process file upload" });
  });
}

module.exports = {
  uploadResumeFile,
  resumeFileFilter,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_RESUME_FILE_SIZE_BYTES,
  MAX_RESUME_FILE_SIZE_MB,
};
