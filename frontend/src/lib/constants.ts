export const AUTH_TOKEN_STORAGE_KEY = "aicareer.token";
export const AUTH_USER_ID_STORAGE_KEY = "aicareer.userId";

// Mirrors server/src/middleware/upload.middleware.js so the UI can reject an
// obviously invalid file before spending a round trip on it.
export const MAX_RESUME_FILE_SIZE_MB = 5;
export const MAX_RESUME_FILE_SIZE_BYTES = MAX_RESUME_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".docx"];
export const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
