# System Architecture

## 1. Overview

The AI Career Assistant Platform follows a modern full-stack architecture consisting of multiple layers including frontend, backend, AI processing, and database layers.

The architecture is designed to provide scalability, maintainability, and efficient integration with Artificial Intelligence services.



# 2. High-Level Architecture

The system consists of the following major components:

1. Presentation Layer (Frontend)
2. Application Layer (Backend API)
3. AI Processing Layer
4. Data Storage Layer

## Frontend Layer

Technology:

- React
- TypeScript
- Tailwind CSS

Responsibilities:

- Provide user interface
- Handle user interactions
- Upload resumes
- Display AI analysis results
- Visualize career recommendations

## Backend Layer

Technology:

- Node.js
- Express.js

Responsibilities:

- Handle API requests
- Manage authentication
- Process uploaded files
- Communicate with AI services
- Manage database operations

## AI Processing Layer

Technology:

- Large Language Models (LLMs)
- OpenAI API / Ollama

Responsibilities:

- Resume understanding
- Skill extraction
- ATS score generation
- Job matching
- Career recommendations
- Interview question generation


## Database Layer

Technology:

- PostgreSQL (Supabase)

Responsibilities:

Store:

- User information
- Resume details
- Job descriptions
- Analysis results
- User history


# Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Supabase |
| AI | LLM, OpenAI API, Ollama |
| File Processing | PDF Parser, DOCX Parser |
| Version Control | Git, GitHub |


# Data Flow

1. User uploads a resume through the frontend application.

2. Frontend sends resume data to the backend API.

3. Backend processes the uploaded file and extracts text.

4. Extracted resume information is sent to the AI processing layer.

5. AI model analyzes the resume and generates insights.

6. Results are stored in the database.

7. Frontend retrieves and displays analysis results to the user.


