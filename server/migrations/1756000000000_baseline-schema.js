/* eslint-disable camelcase */

// Registers the schema that already existed before migration tooling was
// introduced (previously applied by hand from ../src/config/schema.sql).
// Every statement is idempotent (IF NOT EXISTS) so running this against a
// database that already has the schema is a no-op that just records the
// migration as applied; running it against a fresh database creates
// everything from scratch.
exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti UUID PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resumes (
      resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      original_file_name VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

    CREATE TABLE IF NOT EXISTS resume_analyses (
      analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      resume_id UUID NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
      ats_score INTEGER NOT NULL CHECK (ats_score >= 0 AND ats_score <= 100),
      score_breakdown JSONB NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
      weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
      skills JSONB NOT NULL DEFAULT '[]'::jsonb,
      education JSONB NOT NULL DEFAULT '[]'::jsonb,
      experience JSONB NOT NULL DEFAULT '[]'::jsonb,
      recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume_id ON resume_analyses(resume_id);

    CREATE TABLE IF NOT EXISTS job_descriptions (
      job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON job_descriptions(user_id);

    CREATE TABLE IF NOT EXISTS job_matches (
      match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES job_descriptions(job_id) ON DELETE CASCADE,
      resume_id UUID NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
      match_percentage INTEGER NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
      score_breakdown JSONB NOT NULL,
      matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
      missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
      strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
      recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches(job_id);
    CREATE INDEX IF NOT EXISTS idx_job_matches_resume_id ON job_matches(resume_id);

    CREATE TABLE IF NOT EXISTS interview_sessions (
      session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      resume_id UUID NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
      job_id UUID REFERENCES job_descriptions(job_id) ON DELETE SET NULL,
      target_role VARCHAR(255) NOT NULL DEFAULT '',
      questions JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);

    CREATE TABLE IF NOT EXISTS interview_answers (
      answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
      question_id VARCHAR(50) NOT NULL,
      question_text TEXT NOT NULL,
      question_type VARCHAR(20) NOT NULL,
      answer_text TEXT NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
      strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
      weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
      suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_interview_answers_session_id ON interview_answers(session_id);
  `);
};

// This migration only documents schema that predates migration tooling; it
// isn't meant to be rolled back (that would drop every table in the app).
exports.down = () => {
  throw new Error("The baseline migration is not reversible.");
};
