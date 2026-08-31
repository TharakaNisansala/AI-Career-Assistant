const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { matchResumeToJob, getJobMatchHistory } = require("../controllers/jobMatch.controller");

const router = express.Router();

router.post("/job-match/:jobId/resume/:resumeId", authenticate, matchResumeToJob);
router.get("/job-match/:jobId/resume/:resumeId", authenticate, getJobMatchHistory);

module.exports = router;
