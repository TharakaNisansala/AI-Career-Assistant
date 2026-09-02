const pool = require("../config/database");
const { getCompletion } = require("./ai.service");
const { validateQuestionsPayload, validateAnswerEvaluationPayload } = require("../utils/interviewValidation");

const QUESTIONS_SYSTEM_PROMPT =
  "You are an expert technical interviewer and career coach. Generate relevant interview " +
  "questions based on the candidate's resume and, when provided, the target job's " +
  "requirements. Only reference skills, experience, and requirements that are actually " +
  "present in the material you are given -- do not invent unrelated topics.";

function buildQuestionsUserPrompt({ resumeFacts, targetRole, jobRequirements }) {
  const roleLine = targetRole ? `Target role: ${targetRole}` : "Target role: not specified";
  const jobSection = jobRequirements
    ? `\n\nThe candidate is preparing for a role with these hiring requirements:\n${JSON.stringify(
        jobRequirements
      )}`
    : "";

  return `Generate interview questions for a candidate with this background:
Skills: ${resumeFacts.skills.join(", ") || "none listed"}
Experience: ${JSON.stringify(resumeFacts.experience)}
${roleLine}${jobSection}

Return JSON with exactly these fields:
{
  "technicalQuestions": [{"question": "...", "category": "e.g. a specific listed skill, System Design, Data Structures"}],
  "behavioralQuestions": [{"question": "...", "category": "e.g. Teamwork, Leadership, Conflict Resolution"}]
}

Generate 5 technical questions and 5 behavioral questions.`;
}

// Calls the AI service for a set of technical and behavioral interview
// questions and validates the response before returning it. Question ids
// and the type tag are assigned here, deterministically, rather than
// trusted from the AI -- the same "AI supplies content, backend supplies
// structure" split used by jobMatchScoring.service.js for match results.
async function requestAiQuestions({ resumeFacts, targetRole, jobRequirements }) {
  const result = await getCompletion({
    systemPrompt: QUESTIONS_SYSTEM_PROMPT,
    userPrompt: buildQuestionsUserPrompt({ resumeFacts, targetRole, jobRequirements }),
    maxTokens: 2048,
    temperature: 0.5,
    responseFormat: "json",
  });

  const { technicalQuestions, behavioralQuestions } = validateQuestionsPayload(result.parsedContent);

  let counter = 0;
  const nextId = () => `q${++counter}`;

  return [
    ...technicalQuestions.map((q) => ({ questionId: nextId(), type: "technical", ...q })),
    ...behavioralQuestions.map((q) => ({ questionId: nextId(), type: "behavioral", ...q })),
  ];
}

const ANSWER_EVALUATION_SYSTEM_PROMPT =
  "You are an expert interview coach evaluating a candidate's written answer to an " +
  "interview question. Be constructive and specific, and base your evaluation only on " +
  "what the candidate actually wrote -- do not assume unstated experience.";

function buildAnswerEvaluationUserPrompt({ question, questionType, answerText }) {
  return `Evaluate this candidate's answer to a ${questionType} interview question.

Question: "${question}"

Candidate's answer:
"""
${answerText}
"""

Return JSON with exactly these fields:
{
  "score": 0,
  "strengths": ["strength1"],
  "weaknesses": ["weakness1"],
  "suggestions": ["actionable improvement suggestion 1"]
}

The score must be an integer from 0 to 100 reflecting the overall quality of the answer.`;
}

// Calls the AI service to evaluate one answer and validates the response
// before returning it. See validateAnswerEvaluationPayload for why the
// score itself is trusted from the AI here, unlike ats/job-match scoring.
async function requestAiAnswerEvaluation({ question, questionType, answerText }) {
  const result = await getCompletion({
    systemPrompt: ANSWER_EVALUATION_SYSTEM_PROMPT,
    userPrompt: buildAnswerEvaluationUserPrompt({ question, questionType, answerText }),
    maxTokens: 1024,
    temperature: 0.3,
    responseFormat: "json",
  });

  return validateAnswerEvaluationPayload(result.parsedContent);
}

async function createSession({ userId, resumeId, jobId, targetRole, questions }) {
  const result = await pool.query(
    `INSERT INTO interview_sessions (user_id, resume_id, job_id, target_role, questions)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING session_id, user_id, resume_id, job_id, target_role, questions, created_at`,
    [userId, resumeId, jobId || null, targetRole || "", JSON.stringify(questions)]
  );
  return result.rows[0];
}

async function listSessionsForUser(userId, { limit, offset } = {}) {
  const result = await pool.query(
    `SELECT session_id, user_id, resume_id, job_id, target_role, questions, created_at,
            COUNT(*) OVER() AS total_count
     FROM interview_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  const totalItems = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return { rows: result.rows.map(({ total_count, ...row }) => row), totalItems };
}

async function findSessionById(sessionId) {
  const result = await pool.query(
    `SELECT session_id, user_id, resume_id, job_id, target_role, questions, created_at
     FROM interview_sessions
     WHERE session_id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

async function saveAnswer({
  sessionId,
  questionId,
  questionText,
  questionType,
  answerText,
  score,
  strengths,
  weaknesses,
  suggestions,
}) {
  const result = await pool.query(
    `INSERT INTO interview_answers
      (session_id, question_id, question_text, question_type, answer_text, score, strengths, weaknesses, suggestions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING answer_id, session_id, question_id, question_text, question_type, answer_text, score, strengths, weaknesses, suggestions, created_at`,
    [
      sessionId,
      questionId,
      questionText,
      questionType,
      answerText,
      score,
      JSON.stringify(strengths),
      JSON.stringify(weaknesses),
      JSON.stringify(suggestions),
    ]
  );
  return result.rows[0];
}

async function listAnswersForSession(sessionId) {
  const result = await pool.query(
    `SELECT answer_id, session_id, question_id, question_text, question_type, answer_text, score, strengths, weaknesses, suggestions, created_at
     FROM interview_answers
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
}

module.exports = {
  requestAiQuestions,
  requestAiAnswerEvaluation,
  createSession,
  listSessionsForUser,
  findSessionById,
  saveAnswer,
  listAnswersForSession,
};
