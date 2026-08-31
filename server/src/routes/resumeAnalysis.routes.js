const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { analyzeResume, getAnalysisHistory } = require("../controllers/resumeAnalysis.controller");

const router = express.Router();

router.post("/analysis/resume/:resumeId", authenticate, analyzeResume);
router.get("/analysis/resume/:resumeId", authenticate, getAnalysisHistory);

module.exports = router;
