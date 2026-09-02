# API Design

## 1. Overview

The AI Career Assistant Platform uses RESTful APIs to enable communication between the frontend application, backend services, AI processing layer, and database.

The API layer handles user authentication, resume management, AI analysis requests, job matching, and interview preparation features.



# 2. API Architecture

The API follows REST principles.

Base URL:

/api/v1

HTTP Methods:

- GET - Retrieve data
- POST - Create new data
- PUT - Update existing data
- DELETE - Remove data


# 3. Authentication APIs
User Registration

Endpoint
POST /api/v1/auth/register

Purpose
Create a new user account.

Request
    {
    "name": "John Doe",
    "email": "john@gmail.com",
    "password": "password123"
    }

Response
    {
    "message": "User registered successfully",
    "userId": "12345"
    }

User Login

Endpoint
POST /api/v1/auth/login

Purpose
Authenticate user.

Request:
    {
    "email": "john@gmail.com",
    "password": "password123"
    }

Response:
    {
    "status": "success",
    "token": "jwt_token",
    "userId": "12345"
    }

`token` is a short-lived access token (15 minutes by default, `JWT_EXPIRES_IN`).
Login and refresh also set an httpOnly `refreshToken` cookie (scoped to
`/api/v1/auth`, 30 days by default, `REFRESH_TOKEN_EXPIRES_IN_DAYS`) -- it is
never exposed in a JSON response body.

Refresh Access Token

Endpoint
POST /api/v1/auth/refresh

Purpose
Exchange the httpOnly refresh cookie for a new access token, without
requiring the password again. The refresh token is rotated on every call
(the old one is revoked and a new one issued), so reusing an old cookie value
after it has already been rotated fails with 401.

Response:
    {
    "status": "success",
    "token": "jwt_token",
    "userId": "12345"
    }

Logout

Endpoint
POST /api/v1/auth/logout

Purpose
Revoke the current access token and refresh token server-side (JWTs are
otherwise stateless and would remain valid until they expire on their own),
and clear the refresh cookie. Requires `Authorization: Bearer <token>`.

Get Current User

Endpoint
GET /api/v1/auth/me

Purpose
Return the authenticated user's profile. Requires `Authorization: Bearer
<token>`.

# 4. Resume APIs
All resume endpoints require a JWT `Authorization: Bearer <token>` header
(see section 3) and only ever read or modify resumes owned by that token's
user; there is no `userId` field in any request body or form data.

Upload Resume

Endpoint
POST /api/v1/resumes/upload

Purpose
Upload a resume file (PDF or DOCX, max 5MB by default) for the
authenticated user.

Request:
Form Data:
resume: resume.pdf

Response (201):
    {
    "status": "success",
    "message": "Resume uploaded successfully",
    "resume": {
      "resumeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fileName": "resume.pdf",
      "fileSize": 82345,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-08-30T12:00:00.000Z"
    }
    }

Error responses: 400 (missing file, unsupported file type), 413 (file
too large), 401 (missing/invalid token).

Get User Resumes

Endpoint
GET /api/v1/resumes

Purpose:
Retrieve the authenticated user's own uploaded resumes, paginated.

Query parameters (all optional): `page` (default 1), `pageSize` (default
20, max 100). The same `page`/`pageSize` params and `pagination` response
shape are used by every other list endpoint in this document (analysis
history, job description list, job match history, interview session list).

Response (200):
    {
    "status": "success",
    "resumes": [
      {
        "resumeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "fileName": "resume.pdf",
        "fileSize": 82345,
        "mimeType": "application/pdf",
        "uploadedAt": "2026-08-30T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 1,
      "totalPages": 1
    }
    }

Extract Resume Text

Endpoint
GET /api/v1/resumes/{resumeId}/text

Purpose:
Extract and return the plain text content of a resume owned by the
authenticated user (PDF or DOCX), ready to hand to the AI analysis layer.
Nothing is persisted by this endpoint; the text is re-derived from the
stored file on every call.

Response (200):
    {
    "status": "success",
    "resumeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "text": "Jane Doe\nSenior Backend Engineer\n...",
    "characterCount": 1832
    }

Error responses: 400 (invalid resumeId), 401 (missing/invalid token), 404
(resume not found, belongs to another user, or its file is missing from
storage), 422 (the document has no readable text, or could not be parsed
because it is corrupted).

Delete Resume

Endpoint
DELETE /api/v1/resumes/{resumeId}

Purpose:
Delete a resume owned by the authenticated user.

Response (200):
    {
    "status": "success",
    "message": "Resume deleted successfully"
    }

Returns 404 for a resumeId that doesn't exist or that belongs to
another user (the two cases are indistinguishable to the caller).


# 5. AI Resume Analysis APIs
All endpoints in this section require `Authorization: Bearer <token>` and
only operate on resumes owned by that token's user (404 for a resumeId that
doesn't exist or belongs to someone else). `analysisId`, `resumeId`, and
`jobId` throughout this document are UUIDs.

Analyze Resume

Endpoint
POST /api/v1/analysis/resume/{resumeId}

Purpose:
Extract the resume's text, send it to the configured AI provider
(`AI_PROVIDER`; Anthropic or Groq today) for structured facts, score it
deterministically (server/src/services/atsScoring.service.js -- the AI
supplies content, not the score itself), persist the result, and return it.
Rate-limited (`aiRateLimiter`) since each call has a real AI-provider cost.

Response (201):
    {
    "status": "success",
    "message": "Resume analyzed successfully",
    "analysis": {
      "analysisId": "3fa85f64-...",
      "resumeId": "3fa85f64-...",
      "atsScore": 85,
      "scoreBreakdown": [ { "key": "skills", "label": "Skills", "weight": 0.3, "score": 80, "weightedScore": 24, "explanation": "..." } ],
      "summary": "...",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "skills": ["React", "Node.js"],
      "education": [ { "degree": "...", "field": "...", "institution": "...", "graduationYear": "..." } ],
      "experience": [ { "title": "...", "company": "...", "startDate": "...", "endDate": "...", "description": "..." } ],
      "recommendations": ["Add more project details"],
      "createdAt": "2026-08-30T12:00:00.000Z"
    }
    }

Error responses: 400 (invalid resumeId), 404 (resume not found/not owned),
415/422 (unsupported or unreadable document), 429 (AI rate limit), 502/504
(AI provider error/timeout).

Get Analysis History

Endpoint
GET /api/v1/analysis/resume/{resumeId}

Purpose:
List every past analysis for one resume, newest first. Paginated (see
`GET /resumes`).

Response (200):
    {
    "status": "success",
    "analyses": [ /* same shape as "analysis" above */ ],
    "pagination": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
    }

# 6. Job Description & Job Matching APIs

Submit Job Description

Endpoint
POST /api/v1/job-descriptions

Request:
    {
    "title": "Frontend Developer",
    "description": "Looking for a React developer with 2+ years experience..."
    }

Response (201):
    {
    "status": "success",
    "message": "Job description submitted successfully",
    "jobDescription": {
      "jobId": "3fa85f64-...",
      "title": "Frontend Developer",
      "description": "...",
      "createdAt": "2026-08-30T12:00:00.000Z"
    }
    }

List Job Descriptions

Endpoint
GET /api/v1/job-descriptions

Purpose:
List the authenticated user's own job descriptions, newest first.
Paginated (see `GET /resumes`).

Match Resume Against Job Description

Endpoint
POST /api/v1/job-match/{jobId}/resume/{resumeId}

Purpose:
Extract the resume's text and ask the AI for structured resume facts
(reusing the analysis pipeline) and job requirements, then score the match
deterministically (server/src/services/jobMatchScoring.service.js) and
persist it. Both the job description and the resume must belong to the
caller. Rate-limited (`aiRateLimiter`).

Response (201):
    {
    "status": "success",
    "message": "Resume matched against job description successfully",
    "match": {
      "matchId": "3fa85f64-...",
      "jobId": "3fa85f64-...",
      "resumeId": "3fa85f64-...",
      "matchPercentage": 80,
      "scoreBreakdown": [ /* ... */ ],
      "matchedSkills": ["React"],
      "missingSkills": ["AWS", "Docker"],
      "strengths": ["..."],
      "recommendations": ["..."],
      "createdAt": "2026-08-30T12:00:00.000Z"
    }
    }

Get Job Match History

Endpoint
GET /api/v1/job-match/{jobId}/resume/{resumeId}

Purpose:
List every past match result for one job/resume pair, newest first.
Paginated (see `GET /resumes`).


# 7. Interview Preparation APIs

Generate Interview Session

Endpoint
POST /api/v1/interview-prep/sessions

Purpose:
Generate technical and behavioral interview questions from a resume (and,
optionally, a job description for extra context) via the AI provider, and
persist them as a session. Rate-limited (`aiRateLimiter`).

Request:
    {
    "resumeId": "3fa85f64-...",
    "jobId": "3fa85f64-...",
    "targetRole": "Frontend Developer"
    }

`jobId` and `targetRole` are both optional; if `targetRole` is omitted it
falls back to the selected job description's title.

Response (201):
    {
    "status": "success",
    "message": "Interview questions generated successfully",
    "session": {
      "sessionId": "3fa85f64-...",
      "resumeId": "3fa85f64-...",
      "jobId": "3fa85f64-...",
      "targetRole": "Frontend Developer",
      "questions": [ { "questionId": "q1", "type": "technical", "question": "Explain React hooks", "category": "React" } ],
      "createdAt": "2026-08-30T12:00:00.000Z"
    }
    }

List Interview Sessions

Endpoint
GET /api/v1/interview-prep/sessions

Purpose:
List the authenticated user's own interview sessions, newest first.
Paginated (see `GET /resumes`).

Get Interview Session

Endpoint
GET /api/v1/interview-prep/sessions/{sessionId}

Purpose:
Return one session's questions plus every answer submitted for it so far.

Submit Interview Answer

Endpoint
POST /api/v1/interview-prep/sessions/{sessionId}/answers

Purpose:
Score a candidate's written answer to one of the session's questions via
the AI provider and persist the evaluation. Rate-limited (`aiRateLimiter`).

Request:
    {
    "questionId": "q1",
    "answerText": "React hooks let you use state and lifecycle features in function components..."
    }

Response (201):
    {
    "status": "success",
    "message": "Answer evaluated successfully",
    "answer": {
      "answerId": "3fa85f64-...",
      "sessionId": "3fa85f64-...",
      "questionId": "q1",
      "questionText": "Explain React hooks",
      "questionType": "technical",
      "answerText": "...",
      "score": 78,
      "strengths": ["..."],
      "weaknesses": ["..."],
      "suggestions": ["..."],
      "createdAt": "2026-08-30T12:00:00.000Z"
    }
    }

# 8. Dashboard API

Get Dashboard Summary

Endpoint
GET /api/v1/dashboard/summary

Purpose:
A single aggregated read for the dashboard's "at a glance" cards, computed
server-side (server/src/services/dashboard.service.js) rather than the
frontend fanning out to list-resumes + per-resume analysis history +
list-job-descriptions + one job-match-history call.

Response (200):
    {
    "status": "success",
    "totalResumes": 3,
    "recentAnalyses": [ /* up to 5, newest first, same shape as section 5 */ ],
    "latestAnalysis": { /* the newest of recentAnalyses, or null */ },
    "latestMatch": { /* the single most recent match across all of the user's resumes/jobs, or null */ }
    }

# 9. API Summary

| Feature                     | Method | Endpoint                              |
| ---------------------------- | ------ | -------------------------------------- |
| Register                    | POST   | /auth/register                        |
| Login                        | POST   | /auth/login                           |
| Refresh access token         | POST   | /auth/refresh                         |
| Logout                        | POST   | /auth/logout                          |
| Current user                 | GET    | /auth/me                              |
| Upload Resume                | POST   | /resumes/upload                       |
| View Resumes                 | GET    | /resumes                              |
| Extract Resume Text          | GET    | /resumes/{id}/text                    |
| Delete Resume                | DELETE | /resumes/{id}                         |
| Analyze Resume               | POST   | /analysis/resume/{id}                 |
| Analysis History              | GET    | /analysis/resume/{id}                 |
| Submit Job Description        | POST   | /job-descriptions                     |
| List Job Descriptions         | GET    | /job-descriptions                     |
| Run Job Match                 | POST   | /job-match/{jobId}/resume/{resumeId}  |
| Job Match History              | GET    | /job-match/{jobId}/resume/{resumeId}  |
| Generate Interview Session     | POST   | /interview-prep/sessions              |
| List Interview Sessions        | GET    | /interview-prep/sessions              |
| Get Interview Session          | GET    | /interview-prep/sessions/{id}         |
| Submit Interview Answer        | POST   | /interview-prep/sessions/{id}/answers |
| Dashboard Summary              | GET    | /dashboard/summary                    |


# 10. Security Considerations
- JWT-based authentication: short-lived access token + rotating httpOnly
  refresh-token cookie (section 3), with server-side revocation on logout
- Rate limiting: per-IP limits on auth endpoints and a stricter limit on
  every AI-provider-backed endpoint (server/src/middleware/rateLimit.middleware.js)
- Input validation and per-field length limits on every request body
- File upload validation: extension + declared MIME type, then the actual
  file bytes checked against a magic-number signature server-side (declared
  metadata can't be trusted on its own) (server/src/utils/file.utils.js)
- Ownership authorization: every resource lookup verifies the resource
  belongs to the caller's user id (server/src/utils/ownership.js); a
  not-found and a not-yours both return 404, indistinguishably
- TLS: the database connection verifies the real Supabase root CA
  (server/src/config/database.js) rather than disabling certificate
  verification
- A global Express error handler (server/src/middleware/errorHandler.middleware.js)
  ensures any unexpected error still returns a consistent JSON response