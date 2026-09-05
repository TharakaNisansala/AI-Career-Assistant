const rateLimit = require("express-rate-limit");

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many attempts, please try again later" },
  skip: () => process.env.NODE_ENV === "test",
});

// Baseline limiter applied to the whole API so no endpoint is left
// completely unbounded, regardless of the stricter limiters layered on top
// of specific routes (auth, AI-backed endpoints).
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please try again later" },
  skip: () => process.env.NODE_ENV === "test",
});

// Stricter limiter for endpoints that trigger a paid AI provider call, since
// each request has a real dollar cost independent of the generic per-IP
// request volume the baseline limiter above is guarding against.
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many AI requests, please try again later" },
  skip: () => process.env.NODE_ENV === "test",
});

module.exports = { authRateLimiter, apiRateLimiter, aiRateLimiter };
