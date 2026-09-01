const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { aiRateLimiter } = require("../middleware/rateLimit.middleware");
const { analyzeResume, getAnalysisHistory } = require("../controllers/resumeAnalysis.controller");

const router = express.Router();

router.post("/analysis/resume/:resumeId", authenticate, aiRateLimiter, analyzeResume);
router.get("/analysis/resume/:resumeId", authenticate, getAnalysisHistory);

module.exports = router;
