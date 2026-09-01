const crypto = require("crypto");
const path = require("path");

function generateSafeFileName(originalName) {
  const extension = path.extname(originalName || "").toLowerCase();
  const uniqueId = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${uniqueId}${extension}`;
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
