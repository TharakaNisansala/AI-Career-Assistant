const storage = require("./storage");
const { extractText } = require("../utils/textExtraction.utils");

// Thrown when the resume row exists in the DB but its file is missing from
// storage (e.g. deleted out-of-band, or a storage misconfiguration).
class ResumeFileMissingError extends Error {
  constructor(message) {
    super(message);
    this.name = "ResumeFileMissingError";
  }
}

// Reads the resume's file from storage and extracts its text on demand.
// Nothing is persisted here: the uploaded file is already the source of
// truth, so re-deriving text from it on each call avoids keeping a second,
// potentially stale copy of the resume's content in the database.
async function extractResumeText(resume) {
  let buffer;
  try {
    buffer = await storage.readFile(resume.file_path);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new ResumeFileMissingError("The resume file could not be found in storage");
    }
    throw error;
  }

  return extractText(buffer, resume.mime_type);
}

module.exports = { extractResumeText, ResumeFileMissingError };
