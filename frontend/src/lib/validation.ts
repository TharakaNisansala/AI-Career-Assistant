const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the backend's validation rules (server/src/utils/validators.js and
// friends) so the UI can show errors before a round trip, but the backend
// stays the source of truth -- these are UX affordances, not the real check.
export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address";
  return undefined;
}

export function validateName(name: string): string | undefined {
  if (name.trim().length < 2) return "Name must be at least 2 characters long";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8) return "Password must be at least 8 characters long";
  return undefined;
}

export function validateRequired(value: string, fieldLabel: string): string | undefined {
  if (!value.trim()) return `${fieldLabel} is required`;
  return undefined;
}

export function validateJobTitle(title: string): string | undefined {
  if (title.trim().length < 2) return "Job title must be at least 2 characters long";
  return undefined;
}

export function validateJobDescriptionText(description: string): string | undefined {
  if (description.trim().length < 20) {
    return "Job description must be at least 20 characters long";
  }
  return undefined;
}

export function validateAnswerText(answer: string): string | undefined {
  if (answer.trim().length < 10) return "Answer must be at least 10 characters long";
  return undefined;
}

// Only ever follow a same-origin, in-app relative path as a post-login
// redirect target. location.state.from is attacker-influencable (a crafted
// link can set router state), so an absolute URL or a protocol-relative
// "//evil.com" must never be passed straight to navigate().
export function getSafeRedirectPath(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  return path;
}
