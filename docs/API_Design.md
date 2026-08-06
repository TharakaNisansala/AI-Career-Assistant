# API Design

## Authentication APIs

### Register User

POST
/api/auth/register


### Login User

POST
/api/auth/login



# Resume APIs

## Upload Resume

POST
/api/resumes/upload


Purpose:
Upload and process resume files.



## Get Resume

GET
/api/resumes/:id



## Delete Resume

DELETE
/api/resumes/:id



# Analysis APIs

## Analyze Resume

POST
/api/analysis


Purpose:
Generate AI-based resume analysis.



## Get Analysis History

GET
/api/analysis/history




# Job Matching APIs

## Compare Resume With Job

POST
/api/job-match


Purpose:
Compare resume skills with job requirements.