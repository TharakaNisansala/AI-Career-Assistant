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
Upload Resume

Endpoint
POST /api/v1/resumes/upload

Purpose
Upload user resume for analysis.

Request:
Form Data:
file: resume.pdf
userId: 12345

Response:
    {
    "message": "Resume uploaded",
    "resumeId": "resume001"
    }

Get User Resumes

Endpoint
GET /api/v1/resumes

Purpose:
Retrieve uploaded resumes.

Response:
    [
    {
    "resumeId":"001",
    "fileName":"resume.pdf"
    }
    ]

Delete Resume

Endpoint
DELETE /api/v1/resumes/{resumeId}

Purpose:
Delete uploaded resume.


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