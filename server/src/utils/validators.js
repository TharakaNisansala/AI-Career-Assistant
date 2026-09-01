const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
// bcrypt silently ignores bytes past 72; capping well above any real
// passphrase also stops a multi-megabyte string from being hashed at all.
const MAX_PASSWORD_LENGTH = 128;

function validateRegisterInput({ name, email, password }) {
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  } else if (name.trim().length > MAX_NAME_LENGTH) {
    errors.push(`Name must be at most ${MAX_NAME_LENGTH} characters long`);
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    errors.push("A valid email address is required");
  } else if (email.length > MAX_EMAIL_LENGTH) {
    errors.push(`Email must be at most ${MAX_EMAIL_LENGTH} characters long`);
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must be at most ${MAX_PASSWORD_LENGTH} characters long`);
  } else if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    errors.push(
      "Password must include at least one uppercase letter, one lowercase letter, and one number"
    );
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
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push("Invalid email or password");
  }

  return errors;
}

function isValidUUID(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

module.exports = { validateRegisterInput, validateLoginInput, isValidUUID };
