const crypto = require("crypto");
const path = require("path");

// Keeps a recognizable trace of the original name in the stored key (so a
// user's bucket listing/console view is legible) while stripping directory
// separators and repeated dots so it can never escape its own storage key.
function sanitizeStem(stem) {
  const sanitized = stem
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/^[._-]+/, "");
  return sanitized || "file";
}

// Produces a unique, storage-safe file name that keeps the original name's
// (sanitized) stem and lowercased extension, e.g. "resume.PDF" ->
// "3d9c...-resume.pdf". The uuid prefix guarantees uniqueness even when two
// users upload files with the same name.
function generateSafeFileName(originalName) {
  const base = path.basename(String(originalName || "file"));
  const extension = path.extname(base).toLowerCase();
  const stem = sanitizeStem(path.basename(base, path.extname(base)));
  return `${crypto.randomUUID()}-${stem}${extension}`;
}

const PDF_SIGNATURE = Buffer.from("%PDF-", "latin1");
// A DOCX is a zip archive, so its bytes always start with the local-file-header
// magic number, regardless of what its declared name/mime type claims.
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

// Checks the file's actual bytes against what its extension/mime type
// claims it is, since both of those are attacker-controlled request
// metadata and prove nothing about the content that was actually uploaded.
function fileContentMatchesMimeType(buffer, mimeType) {
  if (mimeType === "application/pdf") {
    return buffer.length >= PDF_SIGNATURE.length && buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE);
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return buffer.length >= ZIP_SIGNATURE.length && buffer.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE);
  }
  return false;
}

module.exports = { generateSafeFileName, fileContentMatchesMimeType };
