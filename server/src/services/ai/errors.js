// Thrown when the AI service can't run at all: no API key, or an
// AI_PROVIDER value that has no matching provider module.
class AIConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

// Thrown when the provider doesn't respond within the configured timeout.
class AITimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "AITimeoutError";
  }
}

// Thrown when the provider responds with a rate-limit status (e.g. HTTP 429).
class AIRateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "AIRateLimitError";
  }
}

// Thrown for any other upstream failure: a non-2xx response from the
// provider, or the request never reaching it (network/DNS failure).
class AIProviderError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AIProviderError";
    this.statusCode = statusCode;
  }
}

module.exports = {
  AIConfigurationError,
  AITimeoutError,
  AIRateLimitError,
  AIProviderError,
};
