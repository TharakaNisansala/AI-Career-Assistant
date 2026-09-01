const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const JSZip = require("jszip");

const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// A DOCX is a zip archive, so a tiny upload can still expand to gigabytes
// once inflated (a "zip bomb"). Reject oversized archives before mammoth
// ever inflates their contents into memory.
const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

// Caps how much text a single resume can hand to the AI service, bounding
// per-request AI cost regardless of how the text was produced.
const MAX_EXTRACTED_TEXT_LENGTH = 50000;

// Thrown when a file's bytes can't be parsed as the format its mime type
// claims (e.g. a truncated file, or one that fails structural validation).
class CorruptedDocumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "CorruptedDocumentError";
  }
}

// Thrown when parsing succeeds but yields no usable text (a scanned/image-only
// PDF, or a document that is genuinely blank).
class EmptyDocumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "EmptyDocumentError";
  }
}

// Thrown defensively if a resume's stored mime type isn't one extraction
// supports; upload validation already restricts uploads to PDF/DOCX, so this
// should only fire if that data ever gets out of sync.
class UnsupportedMimeTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedMimeTypeError";
  }
}

// Thrown when a document is structurally valid but too large to safely
// process: either a DOCX archive that would inflate past
// MAX_DOCX_UNCOMPRESSED_BYTES, or extracted text past MAX_EXTRACTED_TEXT_LENGTH.
class DocumentTooLargeError extends Error {
  constructor(message) {
    super(message);
    this.name = "DocumentTooLargeError";
  }
}

// Collapses the whitespace noise PDF/DOCX extractors leave behind (repeated
// blank lines, trailing spaces) without altering the actual words, so the
// text handed to the AI service later is compact but still readable.
function normalizeText(rawText) {
  return rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isBlankText(text) {
  return !text || text.trim().length === 0;
}

async function extractTextFromPdf(buffer) {
  let parser;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return normalizeText(result.pages.map((page) => page.text).join("\n\n"));
  } catch (error) {
    console.error("PDF parsing failed:", error.message);
    throw new CorruptedDocumentError("Unable to parse PDF file");
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

// Reads the zip central directory (cheap: no entry is inflated yet) and
// rejects the file if the total uncompressed size of its entries is
// implausibly large for a resume, before mammoth inflates them for real.
async function assertSafeDocxSize(buffer) {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (error) {
    console.error("DOCX zip parsing failed:", error.message);
    throw new CorruptedDocumentError("Unable to parse DOCX file");
  }

  const totalUncompressedBytes = Object.values(zip.files).reduce(
    (total, entry) => total + (entry._data ? entry._data.uncompressedSize : 0),
    0
  );

  if (totalUncompressedBytes > MAX_DOCX_UNCOMPRESSED_BYTES) {
    throw new DocumentTooLargeError("DOCX file is too large to process");
  }
}

async function extractTextFromDocx(buffer) {
  await assertSafeDocxSize(buffer);

  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (error) {
    console.error("DOCX parsing failed:", error.message);
    throw new CorruptedDocumentError("Unable to parse DOCX file");
  }
  return normalizeText(result.value || "");
}

// Dispatches to the right format-specific extractor for the given mime type,
// then rejects text that turned out empty so callers never hand blank
// content on to the AI service.
async function extractText(buffer, mimeType) {
  let text;
  if (mimeType === PDF_MIME_TYPE) {
    text = await extractTextFromPdf(buffer);
  } else if (mimeType === DOCX_MIME_TYPE) {
    text = await extractTextFromDocx(buffer);
  } else {
    throw new UnsupportedMimeTypeError(`Cannot extract text from mime type: ${mimeType}`);
  }

  if (isBlankText(text)) {
    throw new EmptyDocumentError("The document contains no readable text");
  }

  if (text.length > MAX_EXTRACTED_TEXT_LENGTH) {
    throw new DocumentTooLargeError(
      "The document is too long to process. Please upload a shorter resume."
    );
  }

  return text;
}

module.exports = {
  extractText,
  extractTextFromPdf,
  extractTextFromDocx,
  normalizeText,
  isBlankText,
  CorruptedDocumentError,
  EmptyDocumentError,
  UnsupportedMimeTypeError,
  DocumentTooLargeError,
  PDF_MIME_TYPE,
  DOCX_MIME_TYPE,
};
