const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateRegisterInput({ name, email, password }) {
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    errors.push("A valid email address is required");
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  return errors;
}

function validateLoginInput({ email, password }) {
  const errors = [];

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    errors.push("A valid email address is required");
  }

  if (!password || typeof password !== "string" || password.length === 0) {
    errors.push("Password is required");
  }

  return errors;
}

function isValidUUID(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

module.exports = { validateRegisterInput, validateLoginInput, isValidUUID };
