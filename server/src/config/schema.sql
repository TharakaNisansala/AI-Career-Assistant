-- Users table (docs/Database_Design.md section 4.1)
-- Run this once in the Supabase SQL editor (or via psql) before using the auth endpoints.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Resumes table (docs/Database_Design.md section 4.2)
-- file_path stores a storage-driver-specific key (local filename today, an
-- object key if this moves to cloud storage later), not a filesystem path,
-- so the DB row stays portable across storage backends.
CREATE TABLE IF NOT EXISTS resumes (
  resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- Resume analyses table (docs/Database_Design.md section 4.4)
-- ats_score and score_breakdown are computed deterministically by the
-- backend (see services/atsScoring.service.js) from AI-extracted facts, not
-- supplied directly by the AI. skills/education/experience/strengths/
-- weaknesses/recommendations are the validated, structured facts the AI
-- extracted from the resume text (services/resumeAnalysis.service.js).
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
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume_id ON resume_analyses(resume_id);
