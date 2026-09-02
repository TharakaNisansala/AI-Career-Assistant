const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { checkDatabaseConnection } = require("./services/health.service");
const { apiRateLimiter } = require("./middleware/rateLimit.middleware");
const { notFoundHandler, globalErrorHandler } = require("./middleware/errorHandler.middleware");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const resumeRoutes = require("./routes/resume.routes");
const aiRoutes = require("./routes/ai.routes");
const resumeAnalysisRoutes = require("./routes/resumeAnalysis.routes");
const jobDescriptionRoutes = require("./routes/jobDescription.routes");
const jobMatchRoutes = require("./routes/jobMatch.routes");
const interviewPrepRoutes = require("./routes/interviewPrep.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();

// Needed so req.secure / x-forwarded-proto reflect the real client scheme
// when the app runs behind a reverse proxy or load balancer (Render,
// Heroku, nginx, etc.), which is what the HTTPS redirect below relies on.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5180")
  .split(",")
  .map((origin) => origin.trim());

// Only enforced in production: local/dev servers usually aren't served over
// TLS at all, so redirecting there would just break the dev workflow.
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      return next();
    }
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api/v1", apiRateLimiter);

app.use("/api/v1", healthRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1", resumeRoutes);
app.use("/api/v1", aiRoutes);
app.use("/api/v1", resumeAnalysisRoutes);
app.use("/api/v1", jobDescriptionRoutes);
app.use("/api/v1", jobMatchRoutes);
app.use("/api/v1", interviewPrepRoutes);
app.use("/api/v1", dashboardRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

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
