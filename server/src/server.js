const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { checkDatabaseConnection } = require("./services/health.service");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const resumeRoutes = require("./routes/resume.routes");
const aiRoutes = require("./routes/ai.routes");
const resumeAnalysisRoutes = require("./routes/resumeAnalysis.routes");
const jobDescriptionRoutes = require("./routes/jobDescription.routes");
const jobMatchRoutes = require("./routes/jobMatch.routes");
const interviewPrepRoutes = require("./routes/interviewPrep.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", healthRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", resumeRoutes);
app.use("/api/v1", aiRoutes);
app.use("/api/v1", resumeAnalysisRoutes);
app.use("/api/v1", jobDescriptionRoutes);
app.use("/api/v1", jobMatchRoutes);
app.use("/api/v1", interviewPrepRoutes);

const PORT = process.env.PORT || 5000;

const STARTUP_DB_CHECK_RETRIES = 2;
const STARTUP_DB_CHECK_BACKOFF_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkDatabaseConnectionWithRetry() {
  for (let attempt = 0; attempt <= STARTUP_DB_CHECK_RETRIES; attempt++) {
    try {
      return await checkDatabaseConnection();
    } catch (error) {
      if (attempt === STARTUP_DB_CHECK_RETRIES) {
        throw error;
      }
      console.warn(
        `Database connectivity check failed (attempt ${attempt + 1}/${
          STARTUP_DB_CHECK_RETRIES + 1
        }), retrying:`,
        error.message
      );
      await sleep(STARTUP_DB_CHECK_BACKOFF_MS * (attempt + 1));
    }
  }
}

async function startServer() {
  try {
    await checkDatabaseConnectionWithRetry();
    console.log("Database connection verified");
  } catch (error) {
    console.error(
      "Warning: could not verify database connection at startup:",
      error.message
    );
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
