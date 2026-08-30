const crypto = require("crypto");
const path = require("path");

function generateSafeFileName(originalName) {
  const extension = path.extname(originalName || "").toLowerCase();
  const uniqueId = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${uniqueId}${extension}`;
}

module.exports = { generateSafeFileName };
