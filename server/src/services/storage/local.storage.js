const fs = require("fs/promises");
const path = require("path");

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "../../../uploads/resumes");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

// Returns the storage key the caller should persist (e.g. in the DB),
// not an absolute path, so callers stay portable to a future driver
// that keys files under an S3 bucket instead of a local directory.
async function saveFile(buffer, safeFileName) {
  await ensureUploadDir();
  const destination = path.join(UPLOAD_DIR, safeFileName);
  await fs.writeFile(destination, buffer);
  return safeFileName;
}

async function deleteFile(storageKey) {
  const target = path.join(UPLOAD_DIR, storageKey);
  try {
    await fs.unlink(target);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function getAbsolutePath(storageKey) {
  return path.join(UPLOAD_DIR, storageKey);
}

module.exports = { saveFile, deleteFile, getAbsolutePath, UPLOAD_DIR };
