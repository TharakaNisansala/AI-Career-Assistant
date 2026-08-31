const test = require("node:test");
const assert = require("node:assert/strict");
const PDFDocument = require("pdfkit");
const JSZip = require("jszip");
const {
  extractText,
  PDF_MIME_TYPE,
  DOCX_MIME_TYPE,
  EmptyDocumentError,
  CorruptedDocumentError,
  UnsupportedMimeTypeError,
} = require("./textExtraction.utils");

function buildPdfBuffer(text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    if (text) {
      doc.text(text);
    }
    doc.end();
  });
}

const DOCX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const DOCX_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

// Builds a minimal but structurally valid .docx (a zip containing the parts
// mammoth needs) so extraction can be tested against real document bytes
// instead of an opaque fake buffer.
function buildDocxBuffer(bodyXml) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", DOCX_CONTENT_TYPES);
  zip.file("_rels/.rels", DOCX_RELS);
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

test("extractText reads text out of a valid PDF", async () => {
  const buffer = await buildPdfBuffer("Jane Doe - Senior Backend Engineer");
  const text = await extractText(buffer, PDF_MIME_TYPE);
  assert.match(text, /Jane Doe - Senior Backend Engineer/);
});

test("extractText reads text out of a valid DOCX", async () => {
  const buffer = await buildDocxBuffer(
    "<w:p><w:r><w:t>Jane Doe - Senior Backend Engineer</w:t></w:r></w:p>"
  );
  const text = await extractText(buffer, DOCX_MIME_TYPE);
  assert.match(text, /Jane Doe - Senior Backend Engineer/);
});

test("extractText rejects a PDF with no readable text as empty", async () => {
  const buffer = await buildPdfBuffer("");
  await assert.rejects(() => extractText(buffer, PDF_MIME_TYPE), EmptyDocumentError);
});

test("extractText rejects a DOCX with no readable text as empty", async () => {
  const buffer = await buildDocxBuffer("<w:p/>");
  await assert.rejects(() => extractText(buffer, DOCX_MIME_TYPE), EmptyDocumentError);
});

test("extractText rejects a corrupted PDF", async () => {
  const buffer = Buffer.from("%PDF-1.4 this is not a real pdf body at all");
  await assert.rejects(() => extractText(buffer, PDF_MIME_TYPE), CorruptedDocumentError);
});

test("extractText rejects a corrupted DOCX", async () => {
  const buffer = Buffer.from("this is not a zip file at all");
  await assert.rejects(() => extractText(buffer, DOCX_MIME_TYPE), CorruptedDocumentError);
});

test("extractText rejects an unsupported mime type", async () => {
  await assert.rejects(
    () => extractText(Buffer.from("hello"), "text/plain"),
    UnsupportedMimeTypeError
  );
});
