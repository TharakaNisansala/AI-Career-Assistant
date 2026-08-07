# Database Design

## 1. Overview

The AI Career Assistant Platform requires a structured database system to store user information, resumes, job descriptions, AI analysis results, and career improvement data.

The database design focuses on data consistency, scalability, and efficient retrieval of user analysis history.



# 2. Database Technology

## Selected Database

PostgreSQL

## Reason

PostgreSQL is selected because:

- Supports relational data management
- Provides strong data consistency
- Supports complex relationships
- Suitable for scalable applications



# 3. Database Entities

The main entities of the system are:

1. User
2. Resume
3. Job Description
4. Resume Analysis
5. Skill
6. Interview Preparation


# 4. Entity Design


## 4.1 User Table

Purpose:

Stores registered user information.


| Column | Type | Description |
|---|---|---|
| user_id | UUID | Primary Key |
| name | VARCHAR | User name |
| email | VARCHAR | User email |
| password | VARCHAR | Encrypted password |
| created_at | TIMESTAMP | Account creation date |




## 4.2 Resume Table

Purpose:

Stores uploaded resume information.


| Column | Type | Description |
|---|---|---|
| resume_id | UUID | Primary Key |
| user_id | UUID | Foreign Key |
| file_name | VARCHAR | Resume file name |
| file_path | TEXT | Storage location |
| uploaded_at | TIMESTAMP | Upload date |


Relationship:

User 1 ---- Many Resumes




## 4.3 Job Description Table

Purpose:

Stores job requirements provided by users.


| Column | Type | Description |
|---|---|---|
| job_id | UUID | Primary Key |
| user_id | UUID | Foreign Key |
| title | VARCHAR | Job title |
| description | TEXT | Job description |
| created_at | TIMESTAMP | Created date |


Relationship:

User 1 ---- Many Job Descriptions




## 4.4 Resume Analysis Table

Purpose:

Stores AI-generated resume analysis results.


| Column | Type | Description |
|---|---|---|
| analysis_id | UUID | Primary Key |
| resume_id | UUID | Foreign Key |
| ats_score | INTEGER | ATS Score |
| summary | TEXT | AI Summary |
| suggestions | TEXT | Improvements |
| created_at | TIMESTAMP | Analysis date |


Relationship:

Resume 1 ---- Many Analyses




## 4.5 Skill Table

Purpose:

Stores identified user skills.


| Column | Type | Description |
|---|---|---|
| skill_id | UUID | Primary Key |
| skill_name | VARCHAR | Skill name |


Example:

- React
- Node.js
- Python
- AWS




## 4.6 Interview Preparation Table

Purpose:

Stores AI-generated interview preparation data.


| Column | Type | Description |
|---|---|---|
| interview_id | UUID | Primary Key |
| user_id | UUID | Foreign Key |
| question | TEXT | Generated question |
| answer | TEXT | User answer |
| feedback | TEXT | AI feedback |




# 5. Database Relationships


User
↓
Many Resumes


Resume
↓
Many Resume Analyses


User
↓
Many Job Descriptions


User
↓
Many Interview Preparations




# 6. Database Design Considerations

## Security

- Passwords should be encrypted
- User data should be protected


## Scalability

- Database structure supports future features
- New AI modules can be integrated


## Performance

- Proper indexing should be implemented
- Efficient queries should be used