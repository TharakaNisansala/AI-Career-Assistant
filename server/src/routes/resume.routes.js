const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { uploadResumeFile } = require("../middleware/upload.middleware");
const {
  uploadResume,
  listResumes,
  removeResume,
} = require("../controllers/resume.controller");

const router = express.Router();

router.post("/resumes/upload", authenticate, uploadResumeFile, uploadResume);
router.get("/resumes", authenticate, listResumes);
router.delete("/resumes/:resumeId", authenticate, removeResume);

module.exports = router;
