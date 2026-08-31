const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const { submitJobDescription, listJobDescriptions } = require("../controllers/jobDescription.controller");

const router = express.Router();

router.post("/job-descriptions", authenticate, submitJobDescription);
router.get("/job-descriptions", authenticate, listJobDescriptions);

module.exports = router;
