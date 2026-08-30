// Storage driver seam: every driver must expose saveFile(buffer, safeFileName)
// and deleteFile(storageKey), keyed by the STORAGE_DRIVER env var. Swapping to
// cloud storage later means adding a new driver module here (e.g. s3.storage.js)
// and pointing STORAGE_DRIVER at it -- callers never change.
const localStorage = require("./local.storage");

const STORAGE_DRIVER = process.env.STORAGE_DRIVER || "local";

const drivers = {
  local: localStorage,
};

const activeDriver = drivers[STORAGE_DRIVER];

if (!activeDriver) {
  throw new Error(`Unsupported STORAGE_DRIVER: ${STORAGE_DRIVER}`);
}

module.exports = activeDriver;
