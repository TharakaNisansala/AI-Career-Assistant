const pool = require("../config/database");

// A job_match row's resume_id and job_id are only ever created together by
// matchResumeToJob after verifying both belong to the same user (see
// jobMatch.controller.js), so filtering by the resume's owner alone is
// sufficient here -- no separate join through job_descriptions is needed.
async function getDashboardSummary(userId, { recentAnalysesLimit }) {
  const [totalResumesResult, recentAnalysesResult, latestMatchResult] = await Promise.all([
    pool.query("SELECT COUNT(*) AS count FROM resumes WHERE user_id = $1", [userId]),
    pool.query(
      `SELECT ra.analysis_id, ra.resume_id, ra.ats_score, ra.score_breakdown, ra.summary,
              ra.strengths, ra.weaknesses, ra.skills, ra.education, ra.experience,
              ra.recommendations, ra.created_at
       FROM resume_analyses ra
       JOIN resumes r ON r.resume_id = ra.resume_id
       WHERE r.user_id = $1
       ORDER BY ra.created_at DESC
       LIMIT $2`,
      [userId, recentAnalysesLimit]
    ),
    pool.query(
      `SELECT jm.match_id, jm.job_id, jm.resume_id, jm.match_percentage, jm.score_breakdown,
              jm.matched_skills, jm.missing_skills, jm.strengths, jm.recommendations, jm.created_at
       FROM job_matches jm
       JOIN resumes r ON r.resume_id = jm.resume_id
       WHERE r.user_id = $1
       ORDER BY jm.created_at DESC
       LIMIT 1`,
      [userId]
    ),
  ]);

  return {
    totalResumes: Number(totalResumesResult.rows[0].count),
    recentAnalyses: recentAnalysesResult.rows,
    latestMatch: latestMatchResult.rows[0] || null,
  };
}

module.exports = { getDashboardSummary };
