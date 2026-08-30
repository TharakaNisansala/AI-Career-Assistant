const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { generateSafeFileName } = require("./file.utils");

test("generateSafeFileName preserves the lowercased extension", () => {
  assert.equal(path.extname(generateSafeFileName("Resume.PDF")), ".pdf");
  assert.equal(path.extname(generateSafeFileName("cover-letter.docx")), ".docx");
});

test("generateSafeFileName never reuses the original file name", () => {
  const name = generateSafeFileName("../../etc/passwd.pdf");
  assert.ok(!name.includes(".."));
  assert.ok(!name.includes("/"));
  assert.ok(!name.includes("passwd"));
});

test("generateSafeFileName produces unique names on repeated calls", () => {
  const names = new Set(
    Array.from({ length: 20 }, () => generateSafeFileName("resume.pdf"))
  );
  assert.equal(names.size, 20);
});

test("generateSafeFileName only contains safe characters", () => {
  const name = generateSafeFileName("resume.pdf");
  assert.match(name, /^[0-9]+-[0-9a-f]{32}\.pdf$/);
});
