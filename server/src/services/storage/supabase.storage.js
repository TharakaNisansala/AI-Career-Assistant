const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESUMES_BUCKET = "resumes";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use STORAGE_DRIVER=supabase"
  );
}

// The service role key bypasses Row Level Security, so this client must
// only ever be used from trusted server-side code -- never sent to the
// frontend or embedded in a client-facing response.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isNotFoundError(error) {
  const status = error?.status ?? error?.statusCode;
  return status === 404 || status === "404" || /not.?found/i.test(error?.message || "");
}

async function saveFile(buffer, storageKey, { contentType } = {}) {
  const { error } = await supabase.storage
    .from(RESUMES_BUCKET)
    .upload(storageKey, buffer, { contentType, upsert: false });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }
  return storageKey;
}

async function deleteFile(storageKey) {
  const { error } = await supabase.storage.from(RESUMES_BUCKET).remove([storageKey]);
  if (error && !isNotFoundError(error)) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
}

// Mirrors the local driver's readFile contract: throws an ENOENT-coded
// error on a missing object so callers (resumeExtraction.service.js) don't
// need to know which storage driver is active.
async function readFile(storageKey) {
  const { data, error } = await supabase.storage.from(RESUMES_BUCKET).download(storageKey);

  if (error) {
    if (isNotFoundError(error)) {
      const notFoundError = new Error(error.message);
      notFoundError.code = "ENOENT";
      throw notFoundError;
    }
    throw new Error(`Supabase download failed: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

// Not used by any route yet (nothing currently serves the raw resume file
// to the frontend), but available for a future download/preview endpoint
// so it doesn't have to stream the whole file through the API server.
async function getSignedUrl(storageKey, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(RESUMES_BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error) {
    throw new Error(`Supabase signed URL failed: ${error.message}`);
  }
  return data.signedUrl;
}

module.exports = { saveFile, deleteFile, readFile, getSignedUrl };
