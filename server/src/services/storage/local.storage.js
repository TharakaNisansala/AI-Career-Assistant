const fs = require("fs/promises");
const path = require("path");

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "../../../uploads/resumes");

function resolveKeyPath(storageKey) {
  return path.join(UPLOAD_DIR, storageKey);
}

// storageKey may include a userId/ prefix (see file.utils.js), so the parent
// directory has to be created on demand rather than just once at startup.
async function saveFile(buffer, storageKey) {
  const destination = resolveKeyPath(storageKey);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);
  return storageKey;
}

async function deleteFile(storageKey) {
  try {
    await fs.unlink(resolveKeyPath(storageKey));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function readFile(storageKey) {
  return fs.readFile(resolveKeyPath(storageKey));
}

module.exports = { saveFile, deleteFile, readFile, UPLOAD_DIR };
