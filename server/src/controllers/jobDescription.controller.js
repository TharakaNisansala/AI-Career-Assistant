const {
  createJobDescription,
  listJobDescriptionsForUser,
} = require("../services/jobDescription.service");
const { validateJobDescriptionInput } = require("../utils/jobDescriptionValidation");

function serializeJobDescription(job) {
  return {
    jobId: job.job_id,
    title: job.title,
    description: job.description,
    createdAt: job.created_at,
  };
}

async function submitJobDescription(req, res) {
  const errors = validateJobDescriptionInput(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ status: "error", message: errors[0], errors });
  }

  const { title, description } = req.body;

  try {
    const job = await createJobDescription({
      userId: req.user.userId,
      title: title.trim(),
      description: description.trim(),
    });
    res.status(201).json({
      status: "success",
      message: "Job description submitted successfully",
      jobDescription: serializeJobDescription(job),
    });
  } catch (error) {
    console.error("Submitting job description failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to submit job description" });
  }
}

async function listJobDescriptions(req, res) {
  try {
    const jobs = await listJobDescriptionsForUser(req.user.userId);
    res.json({ status: "success", jobDescriptions: jobs.map(serializeJobDescription) });
  } catch (error) {
    console.error("Listing job descriptions failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to fetch job descriptions" });
  }
}

module.exports = { submitJobDescription, listJobDescriptions, serializeJobDescription };
