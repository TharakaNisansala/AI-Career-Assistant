# System Architecture

## Overview

The AI Career Assistant follows a three-layer architecture.

## Architecture Components

### Frontend Layer

Technology:

- React
- TypeScript
- Tailwind CSS

Responsibilities:

- User interface
- Resume upload
- Display analysis results
- Dashboard visualization



### Backend Layer

Technology:

- Node.js
- Express.js

Responsibilities:

- API management
- Authentication
- Resume processing
- AI communication
- Database operations



### Database Layer

Technology:

- PostgreSQL (Supabase)

Stores:

- User information
- Resume data
- Analysis history
- Job descriptions




### AI Processing Layer

Responsibilities:

- Resume understanding
- Skill extraction
- ATS evaluation
- Career recommendations

Technologies:

- LLM Models
- OpenAI API / Ollama




## System Flow

    User
        ↓
    React Frontend
        ↓
    Express Backend
        ↓
    Resume Processing Service
        ↓
    AI Analysis Engine
        ↓
    Database
        ↓
    Result Dashboard