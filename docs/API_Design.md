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
    "token": "jwt_token",
    "userId": "12345"
    }

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
Retrieve the authenticated user's own uploaded resumes.

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
    ]
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
Analyze Resume

Endpoint
POST /api/v1/analysis/resume/{resumeId}

Purpose:
Send resume data to AI engine and generate analysis.

Response:
    {
    "atsScore":85,
    "skills":[
    "React",
    "Node.js"
    ],
    "suggestions":[
    "Add more project details"
    ]
    }

Get Analysis History

Endpoint
GET /api/v1/analysis/history

Purpose:
Retrieve previous AI analyses.

# 6. Job Matching APIs
Analyze Job Match

Endpoint
POST /api/v1/job-match

Purpose:
Compare resume with job description.

Request:
    {
    "resumeId":"001",
    "jobDescription":"Looking for React Developer"
    }

Response:
    {
    "matchPercentage":80,
    "missingSkills":[
    "AWS",
    "Docker"
    ]
    }


# 7. Interview Preparation APIs
Generate Interview Questions

Endpoint
POST /api/v1/interview/generate

Purpose:
Generate AI interview questions.

Request:
    {
    "role":"Frontend Developer",
    "experience":"Junior"
    }

Response:
    {
    "questions":[
    "Explain React hooks"
    ]
    }

Submit Answer

Endpoint
POST /api/v1/interview/evaluate

Purpose:
Evaluate user answer using AI.


# 8. API Summary

| Feature            | Method | Endpoint              |
| ------------------ | ------ | --------------------- |
| Register           | POST   | /auth/register        |
| Login              | POST   | /auth/login           |
| Upload Resume      | POST   | /resumes/upload       |
| View Resumes       | GET    | /resumes              |
| Extract Resume Text| GET    | /resumes/{id}/text    |
| Delete Resume      | DELETE | /resumes/{id}         |
| Resume Analysis    | POST   | /analysis/resume/{id} |
| Job Matching       | POST   | /job-match            |
| Generate Questions | POST   | /interview/generate   |
| Evaluate Answer    | POST   | /interview/evaluate   |


# 9. Security Considerations
JWT based authentication
Input validation
File type validation
API authorization
Secure data transmission