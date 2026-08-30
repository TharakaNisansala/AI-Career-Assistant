const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidUUID } = require("./validators");

test("isValidUUID accepts a well-formed v4 UUID", () => {
  assert.equal(isValidUUID("3fa85f64-5717-4562-b3fc-2c963f66afa6"), true);
});

test("isValidUUID rejects non-UUID strings", () => {
  assert.equal(isValidUUID("not-a-uuid"), false);
  assert.equal(isValidUUID("12345"), false);
  assert.equal(isValidUUID(""), false);
});

test("isValidUUID rejects non-string input", () => {
  assert.equal(isValidUUID(undefined), false);
  assert.equal(isValidUUID(null), false);
  assert.equal(isValidUUID(12345), false);
});
