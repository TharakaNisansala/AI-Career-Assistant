-- Users table (docs/Database_Design.md section 4.1)
-- Run this once in the Supabase SQL editor (or via psql) before using the auth endpoints.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_analyses_resume_id ON resume_analyses(resume_id);

-- Job descriptions table (docs/Database_Design.md section 4.3)
CREATE TABLE IF NOT EXISTS job_descriptions (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON job_descriptions(user_id);

-- Job matches table
-- match_percentage and score_breakdown are computed deterministically by the
-- backend (see services/jobMatchScoring.service.js) from AI-extracted resume
-- facts (reusing services/resumeAnalysis.service.js) and AI-extracted job
-- requirements, not supplied directly by the AI. matched_skills/
-- missing_skills/strengths/recommendations are likewise derived from that
-- same deterministic breakdown.
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

-- Interview sessions table
-- questions is the AI-generated, validated set of technical and behavioral
-- interview questions (services/interviewPrep.service.js), built from the
-- resume's AI-extracted skills/experience (reusing resumeAnalysis.service.js)
-- plus the target role and, when job_id is set, that job's AI-extracted
-- requirements (reusing jobMatch.service.js). user_id is stored directly
-- (like job_descriptions.user_id) so ownership can be checked without a join.
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

-- Interview answers table
-- Unlike ats_score/match_percentage above, score/strengths/weaknesses/
-- suggestions here come directly from the AI's evaluation of the candidate's
-- free-text answer (services/interviewPrep.service.js): answer quality isn't
-- reducible to deterministic keyword arithmetic, so the AI's judgment is
-- stored as-is once validated, rather than the backend computing a score.
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
