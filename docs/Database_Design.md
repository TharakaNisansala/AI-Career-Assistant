# Database Design

## Users Table

| Column | Type | Description |
|---|---|---|
| id | UUID | User identifier |
| name | VARCHAR | User name |
| email | VARCHAR | User email |
| password | VARCHAR | Encrypted password |
| created_at | DATE | Account creation date |




## Resumes Table

| Column | Type | Description |
|---|---|---|
| id | UUID | Resume identifier |
| user_id | UUID | Owner |
| file_name | VARCHAR | Resume file name |
| resume_text | TEXT | Extracted text |
| uploaded_at | DATE | Upload date |




## Job Descriptions Table

| Column | Type | Description |
|---|---|---|
| id | UUID | Job ID |
| user_id | UUID | User |
| title | VARCHAR | Job title |
| description | TEXT | Job description |




## Analysis Table

| Column | Type | Description |
|---|---|---|
| id | UUID | Analysis ID |
| resume_id | UUID | Resume reference |
| job_id | UUID | Job reference |
| ats_score | INTEGER | ATS score |
| strengths | TEXT | Strengths |
| weaknesses | TEXT | Weaknesses |
| recommendations | TEXT | AI suggestions |