import { apiClient } from "@/lib/apiClient";
import type {
  GenerateInterviewSessionResponse,
  GetInterviewSessionResponse,
  InterviewAnswer,
  InterviewSession,
  ListInterviewSessionsResponse,
  SubmitInterviewAnswerResponse,
} from "@/types/api";

export interface GenerateInterviewSessionInput {
  resumeId: string;
  jobId?: string;
  targetRole?: string;
}

export async function generateInterviewSession(
  input: GenerateInterviewSessionInput
): Promise<InterviewSession> {
  const { data } = await apiClient.post<GenerateInterviewSessionResponse>(
    "/interview-prep/sessions",
    input
  );
  return data.session;
}

export async function listInterviewSessions(): Promise<InterviewSession[]> {
  const { data } = await apiClient.get<ListInterviewSessionsResponse>(
    "/interview-prep/sessions"
  );
  return data.sessions;
}

export async function getInterviewSession(
  sessionId: string
): Promise<{ session: InterviewSession; answers: InterviewAnswer[] }> {
  const { data } = await apiClient.get<GetInterviewSessionResponse>(
    `/interview-prep/sessions/${sessionId}`
  );
  return { session: data.session, answers: data.answers };
}

export async function submitInterviewAnswer(
  sessionId: string,
  questionId: string,
  answerText: string
): Promise<InterviewAnswer> {
  const { data } = await apiClient.post<SubmitInterviewAnswerResponse>(
    `/interview-prep/sessions/${sessionId}/answers`,
    { questionId, answerText }
  );
  return data.answer;
}
