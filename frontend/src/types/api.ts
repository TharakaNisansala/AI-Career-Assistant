export interface ApiErrorResponse {
  status: "error";
  message: string;
  errors?: string[];
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface RegisterResponse {
  status: "success";
  message: string;
}

export interface LoginResponse {
  status: "success";
  token: string;
  userId: string;
}

export interface CurrentUserResponse {
  status: "success";
  user: User;
}

export interface Resume {
  resumeId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface UploadResumeResponse {
  status: "success";
  message: string;
  resume: Resume;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListResumesResponse {
  status: "success";
  resumes: Resume[];
  pagination: PaginationMeta;
}

export interface ResumeTextResponse {
  status: "success";
  resumeId: string;
  text: string;
  characterCount: number;
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  weight: number;
  score: number;
  weightedScore: number;
  explanation: string;
}

export interface EducationEntry {
  degree: string;
  field: string;
  institution: string;
  graduationYear: string;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ResumeAnalysis {
  analysisId: string;
  resumeId: string;
  atsScore: number;
  scoreBreakdown: ScoreBreakdownItem[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  recommendations: string[];
  createdAt: string;
}

export interface AnalyzeResumeResponse {
  status: "success";
  message: string;
  analysis: ResumeAnalysis;
}

export interface AnalysisHistoryResponse {
  status: "success";
  analyses: ResumeAnalysis[];
  pagination: PaginationMeta;
}

export interface JobDescription {
  jobId: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface SubmitJobDescriptionResponse {
  status: "success";
  message: string;
  jobDescription: JobDescription;
}

export interface ListJobDescriptionsResponse {
  status: "success";
  jobDescriptions: JobDescription[];
  pagination: PaginationMeta;
}

export interface JobMatch {
  matchId: string;
  jobId: string;
  resumeId: string;
  matchPercentage: number;
  scoreBreakdown: ScoreBreakdownItem[];
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  recommendations: string[];
  createdAt: string;
}

export interface RunJobMatchResponse {
  status: "success";
  message: string;
  match: JobMatch;
}

export interface JobMatchHistoryResponse {
  status: "success";
  matches: JobMatch[];
  pagination: PaginationMeta;
}

export type InterviewQuestionType = "technical" | "behavioral";

export interface InterviewQuestion {
  questionId: string;
  type: InterviewQuestionType;
  question: string;
  category: string;
}

export interface InterviewSession {
  sessionId: string;
  resumeId: string;
  jobId: string | null;
  targetRole: string;
  questions: InterviewQuestion[];
  createdAt: string;
}

export interface GenerateInterviewSessionResponse {
  status: "success";
  message: string;
  session: InterviewSession;
}

export interface ListInterviewSessionsResponse {
  status: "success";
  sessions: InterviewSession[];
  pagination: PaginationMeta;
}

export interface InterviewAnswer {
  answerId: string;
  sessionId: string;
  questionId: string;
  questionText: string;
  questionType: InterviewQuestionType;
  answerText: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  createdAt: string;
}

export interface GetInterviewSessionResponse {
  status: "success";
  session: InterviewSession;
  answers: InterviewAnswer[];
}

export interface SubmitInterviewAnswerResponse {
  status: "success";
  message: string;
  answer: InterviewAnswer;
}
