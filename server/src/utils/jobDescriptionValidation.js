const MIN_DESCRIPTION_LENGTH = 20;

function validateJobDescriptionInput({ title, description }) {
  const errors = [];

  if (!title || typeof title !== "string" || title.trim().length < 2) {
    errors.push("Job title must be at least 2 characters long");
  }

  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length < MIN_DESCRIPTION_LENGTH
  ) {
    errors.push(`Job description must be at least ${MIN_DESCRIPTION_LENGTH} characters long`);
  }

  return errors;
}

module.exports = { validateJobDescriptionInput };
