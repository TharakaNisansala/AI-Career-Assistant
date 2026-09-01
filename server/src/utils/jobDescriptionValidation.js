const MIN_DESCRIPTION_LENGTH = 20;
const MAX_TITLE_LENGTH = 200;
// Generous enough for a real job posting, but bounded so a submission can't
// balloon the AI prompt built from it (see jobMatch.service.js).
const MAX_DESCRIPTION_LENGTH = 20000;

function validateJobDescriptionInput({ title, description }) {
  const errors = [];

  if (!title || typeof title !== "string" || title.trim().length < 2) {
    errors.push("Job title must be at least 2 characters long");
  } else if (title.trim().length > MAX_TITLE_LENGTH) {
    errors.push(`Job title must be at most ${MAX_TITLE_LENGTH} characters long`);
  }

  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length < MIN_DESCRIPTION_LENGTH
  ) {
    errors.push(`Job description must be at least ${MIN_DESCRIPTION_LENGTH} characters long`);
  } else if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Job description must be at most ${MAX_DESCRIPTION_LENGTH} characters long`);
  }

  return errors;
}

module.exports = { validateJobDescriptionInput };
