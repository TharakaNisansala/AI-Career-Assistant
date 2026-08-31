const test = require("node:test");
const assert = require("node:assert/strict");
const PDFDocument = require("pdfkit");
const storage = require("./storage");
const { PDF_MIME_TYPE } = require("../utils/textExtraction.utils");
const {
  extractResumeText,
  ResumeFileMissingError,
} = require("./resumeExtraction.service");

function buildPdfBuffer(text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.text(text);
    doc.end();
  });
}

// Exercises the service against the real local storage driver (write, read,
// clean up) rather than mocking it, matching the rest of this codebase's
// preference for hitting real I/O over test doubles.
async function withStoredFile(buffer, fileName, run) {
  const storageKey = await storage.saveFile(buffer, fileName);
  try {
    await run(storageKey);
  } finally {
    await storage.deleteFile(storageKey);
  }
}

test("extractResumeText reads and extracts text from a stored PDF", async () => {
  const buffer = await buildPdfBuffer("Resume content for extraction test");
  await withStoredFile(buffer, "extraction-test.pdf", async (storageKey) => {
    const resume = { file_path: storageKey, mime_type: PDF_MIME_TYPE };
    const text = await extractResumeText(resume);
    assert.match(text, /Resume content for extraction test/);
  });
});

test("extractResumeText throws ResumeFileMissingError when the file is absent from storage", async () => {
  const resume = { file_path: "does-not-exist.pdf", mime_type: PDF_MIME_TYPE };
  await assert.rejects(() => extractResumeText(resume), ResumeFileMissingError);
});
