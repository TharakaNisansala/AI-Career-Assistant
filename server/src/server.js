const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { checkDatabaseConnection } = require("./services/health.service");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", healthRoutes);
app.use("/api/v1", authRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await checkDatabaseConnection();
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
