const test = require("node:test");
const assert = require("node:assert/strict");
const { validateJobDescriptionInput } = require("./jobDescriptionValidation");

test("validateJobDescriptionInput accepts a valid title and description", () => {
  const errors = validateJobDescriptionInput({
    title: "Backend Engineer",
    description: "We are looking for a backend engineer with strong Node.js experience.",
  });
  assert.deepEqual(errors, []);
});

test("validateJobDescriptionInput rejects an empty job description", () => {
  const errors = validateJobDescriptionInput({ title: "Backend Engineer", description: "" });
  assert.ok(errors.length > 0);
  assert.match(errors[0], /at least 20 characters/);
});

test("validateJobDescriptionInput rejects a whitespace-only job description", () => {
  const errors = validateJobDescriptionInput({ title: "Backend Engineer", description: "    " });
  assert.ok(errors.length > 0);
});

test("validateJobDescriptionInput rejects a missing title", () => {
  const errors = validateJobDescriptionInput({
    description: "We are looking for a backend engineer with strong Node.js experience.",
  });
  assert.ok(errors.some((error) => /title/i.test(error)));
});

test("validateJobDescriptionInput rejects a non-string description", () => {
  const errors = validateJobDescriptionInput({ title: "Backend Engineer", description: 12345 });
  assert.ok(errors.length > 0);
});
