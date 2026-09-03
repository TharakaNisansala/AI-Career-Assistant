AI Career Assistant Platform

An AI-powered career assistant platform designed to help job seekers improve their resumes, evaluate ATS compatibility, match resumes with job descriptions, identify skill gaps, and receive personalized career guidance using Large Language Models (LLMs).

Project Status: Under Development


Overview

The AI Career Assistant Platform helps users analyze their resumes and improve their chances of getting shortlisted for job opportunities. The platform uses Artificial Intelligence to evaluate resumes against job descriptions, provide ATS scores, identify missing skills, suggest improvements, generate interview questions, and recommend personalized learning paths.

This project is being developed as a full-stack portfolio application to demonstrate software engineering principles, AI integration, system design, and modern web development practices.


Objectives

* Analyze resumes using AI
* Evaluate ATS compatibility
* Match resumes with job descriptions
* Identify missing technical and soft skills
* Generate personalized resume improvement suggestions
* Recommend learning resources based on skill gaps
* Generate interview preparation questions
* Track previous resume analyses


Planned Features

User Management
* User Registration
* Secure Login
* Profile Management

Resume Management
* Upload Resume (PDF/DOCX)
* Resume History
* Resume Version Management

AI Resume Analysis
* ATS Score Calculation
* Resume Summary
* Skill Extraction
* Experience Analysis
* Education Analysis
* Keyword Detection

Job Matching
* Compare Resume with Job Description
* Match Percentage
* Missing Skills Identification
* Resume Optimization Suggestions

Career Guidance
* Personalized Learning Roadmap
* Career Improvement Suggestions
* Recommended Technologies
* Skill Development Plan

Interview Preparation
* Technical Interview Questions
* HR Interview Questions
* AI Feedback on Answers


Tech Stack

Frontend
* React
* TypeScript
* Tailwind CSS
* Vite

Backend
* Node.js
* Express.js

Database
* PostgreSQL (Supabase)

AI
* Configurable provider (`AI_PROVIDER` in server/.env): Anthropic Claude or Groq today

File Processing
* PDF Parser
* DOCX Parser

Deployment
* Vercel (Frontend)
* Render (Backend)
* Supabase (Database)
  

Project Structure

text
AI-Career-Assistant/
│
├── docs/               Design docs (this repo's docs/*.md)
├── frontend/           React + TypeScript + Vite + Tailwind (frontend/src)
├── server/             Node.js + Express API (server/src)
│   ├── migrations/     node-pg-migrate migrations (schema changes)
│   └── src/config/schema.sql   Reference copy of the baseline schema
├── README.md
└── .gitignore


Getting Started

Backend (server/):
1. `cd server && npm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (Supabase's
   pooler connection, port 6543 -- used by the app at runtime), `DIRECT_URL`
   (Supabase's direct connection, port 5432 -- used only by migrations,
   since PgBouncer's transaction pooling mode doesn't reliably support the
   prepared statements / session-level DDL that node-pg-migrate needs),
   `JWT_SECRET`, and an AI provider key (`AI_PROVIDER` + `AI_API_KEY`)
3. `npm run migrate` -- applies the schema via node-pg-migrate
4. `npm run dev` -- starts the API on `PORT` (default 5000)

Frontend (frontend/):
1. `cd frontend && npm install`
2. Copy `.env.example` to `.env.local` and point `VITE_API_BASE_URL` at the
   backend (default `http://localhost:5000/api/v1`)
3. `npm run dev` -- starts the Vite dev server

Run `npm test` in server/ for the backend test suite, and `npm run build`
in frontend/ for a type-checked production build.


Development Roadmap

Week 1
* Project Planning
* Requirement Analysis
* System Design
* Database Design
* API Design

Week 2
* Frontend Development

Week 3
* Backend Development
* Resume Processing

Week 4
* AI Resume Analysis

Week 5
* Job Matching System

Week 6
* Interview Preparation Module

Week 7
* Dashboard & Testing

Week 8
* Deployment & Documentation


Documentation

Project documentation will be available in the **docs/** directory.
* Project Overview
* Requirements Specification
* System Architecture
* Database Design
* API Documentation
* User Flow
* UI/UX Design
* Development Plan


Target Users
* University Students
* Fresh Graduates
* Job Seekers
* Career Changers
* Junior Software Engineers


Future Enhancements
* AI Mock Interview
* Resume Builder
* Cover Letter Generator
* LinkedIn Profile Analyzer
* Portfolio Evaluation
* Career Progress Dashboard


Author
Tharaka Balasooriya
Computer Science Graduate | Full Stack Developer | AI Enthusiast


Note
This project is currently under active development and is being built as a production-style portfolio project to demonstrate full-stack development, AI integration, system architecture, and modern software engineering practices.
