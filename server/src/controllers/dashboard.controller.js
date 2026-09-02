const { getDashboardSummary } = require("../services/dashboard.service");
const { serializeAnalysis } = require("./resumeAnalysis.controller");
const { serializeJobMatch } = require("./jobMatch.controller");

const RECENT_ANALYSES_LIMIT = 5;

// One round trip replacing what used to be a client-side fan-out (list every
// resume, fetch analysis history per resume, list job descriptions, fetch
// one job match history) done in frontend/src/hooks/useDashboardData.ts.
async function getSummary(req, res) {
  try {
    const { totalResumes, recentAnalyses, latestMatch } = await getDashboardSummary(
      req.user.userId,
      { recentAnalysesLimit: RECENT_ANALYSES_LIMIT }
    );

    res.json({
      status: "success",
      totalResumes,
      recentAnalyses: recentAnalyses.map(serializeAnalysis),
      latestAnalysis: recentAnalyses[0] ? serializeAnalysis(recentAnalyses[0]) : null,
      latestMatch: latestMatch ? serializeJobMatch(latestMatch) : null,
    });
  } catch (error) {
    console.error("Fetching dashboard summary failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to fetch dashboard summary" });
  }
}

module.exports = { getSummary };
