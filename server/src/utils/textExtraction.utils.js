const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
    throw new CorruptedDocumentError(`Unable to parse PDF file: ${error.message}`);
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

async function extractTextFromDocx(buffer) {
  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (error) {
    throw new CorruptedDocumentError(`Unable to parse DOCX file: ${error.message}`);
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
  PDF_MIME_TYPE,
  DOCX_MIME_TYPE,
};
