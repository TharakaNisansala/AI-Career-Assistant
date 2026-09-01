const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { aiRateLimiter } = require("../middleware/rateLimit.middleware");
const {
  generateInterviewSession,
  getInterviewSessions,
  getInterviewSession,
  submitInterviewAnswer,
} = require("../controllers/interviewPrep.controller");

const router = express.Router();

router.post("/interview-prep/sessions", authenticate, aiRateLimiter, generateInterviewSession);
router.get("/interview-prep/sessions", authenticate, getInterviewSessions);
router.get("/interview-prep/sessions/:sessionId", authenticate, getInterviewSession);
router.post(
  "/interview-prep/sessions/:sessionId/answers",
  authenticate,
  aiRateLimiter,
  submitInterviewAnswer
);

module.exports = router;
