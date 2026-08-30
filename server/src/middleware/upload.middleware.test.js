const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const {
  uploadResumeFile,
  resumeFileFilter,
  MAX_RESUME_FILE_SIZE_BYTES,
} = require("./upload.middleware");

function invokeFileFilter(file) {
  return new Promise((resolve) => {
    resumeFileFilter({}, file, (error, accepted) => {
      resolve({ error, accepted });
    });
  });
}

test("resumeFileFilter accepts a PDF", async () => {
  const { error, accepted } = await invokeFileFilter({
    originalname: "resume.pdf",
    mimetype: "application/pdf",
  });
  assert.equal(error, null);
  assert.equal(accepted, true);
});

test("resumeFileFilter accepts a DOCX", async () => {
  const { error, accepted } = await invokeFileFilter({
    originalname: "resume.docx",
    mimetype:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  assert.equal(error, null);
  assert.equal(accepted, true);
});

test("resumeFileFilter rejects an unsupported extension", async () => {
  const { error } = await invokeFileFilter({
    originalname: "resume.exe",
    mimetype: "application/octet-stream",
  });
  assert.equal(error.name, "UnsupportedFileTypeError");
});

test("resumeFileFilter rejects a spoofed mime type on an allowed extension", async () => {
  const { error } = await invokeFileFilter({
    originalname: "resume.pdf",
    mimetype: "application/octet-stream",
  });
  assert.equal(error.name, "UnsupportedFileTypeError");
});

test("resumeFileFilter rejects a legacy .doc file (not in scope)", async () => {
  const { error } = await invokeFileFilter({
    originalname: "resume.doc",
    mimetype: "application/msword",
  });
  assert.equal(error.name, "UnsupportedFileTypeError");
});

function buildTestApp() {
  const app = express();
  app.post("/test-upload", uploadResumeFile, (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "A resume file is required" });
    }
    res.status(200).json({
      status: "success",
      file: { name: req.file.originalname, size: req.file.size },
    });
  });
  return app;
}

async function withServer(run) {
  const app = buildTestApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function buildForm(fields) {
  const form = new FormData();
  for (const [name, blob, filename] of fields) {
    form.append(name, blob, filename);
  }
  return form;
}

test("upload endpoint accepts a valid PDF", async () => {
  await withServer(async (baseUrl) => {
    const blob = new Blob([Buffer.from("%PDF-1.4 fake pdf content")], {
      type: "application/pdf",
    });
    const response = await fetch(`${baseUrl}/test-upload`, {
      method: "POST",
      body: buildForm([["resume", blob, "resume.pdf"]]),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, "success");
    assert.equal(body.file.name, "resume.pdf");
  });
});

test("upload endpoint accepts a valid DOCX", async () => {
  await withServer(async (baseUrl) => {
    const blob = new Blob([Buffer.from("fake docx content")], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const response = await fetch(`${baseUrl}/test-upload`, {
      method: "POST",
      body: buildForm([["resume", blob, "resume.docx"]]),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, "success");
  });
});

test("upload endpoint rejects an unsupported file type", async () => {
  await withServer(async (baseUrl) => {
    const blob = new Blob([Buffer.from("MZ fake exe content")], {
      type: "application/octet-stream",
    });
    const response = await fetch(`${baseUrl}/test-upload`, {
      method: "POST",
      body: buildForm([["resume", blob, "malware.exe"]]),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.status, "error");
  });
});

test("upload endpoint rejects an oversized file", async () => {
  await withServer(async (baseUrl) => {
    const oversized = Buffer.alloc(MAX_RESUME_FILE_SIZE_BYTES + 1024, 1);
    const blob = new Blob([oversized], { type: "application/pdf" });
    const response = await fetch(`${baseUrl}/test-upload`, {
      method: "POST",
      body: buildForm([["resume", blob, "big-resume.pdf"]]),
    });
    assert.equal(response.status, 413);
    const body = await response.json();
    assert.equal(body.status, "error");
  });
});

test("upload endpoint returns 400 when no file is attached", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/test-upload`, {
      method: "POST",
      body: buildForm([]),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.status, "error");
  });
});
