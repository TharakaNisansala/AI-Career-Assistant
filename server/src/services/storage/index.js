// Storage driver seam: every driver must expose saveFile(buffer, storageKey),
// deleteFile(storageKey) and readFile(storageKey), keyed by the
// STORAGE_DRIVER env var. Callers never touch a driver module directly, so
// swapping STORAGE_DRIVER (e.g. back to "local" for dev) needs no code change.
const STORAGE_DRIVER = process.env.STORAGE_DRIVER || "local";

// Loaded lazily so selecting "local" never requires Supabase env vars to be
// set (supabase.storage.js throws at require-time if they're missing).
const driverLoaders = {
  local: () => require("./local.storage"),
  supabase: () => require("./supabase.storage"),
};

const loadDriver = driverLoaders[STORAGE_DRIVER];

if (!loadDriver) {
  throw new Error(`Unsupported STORAGE_DRIVER: ${STORAGE_DRIVER}`);
}

module.exports = loadDriver();
