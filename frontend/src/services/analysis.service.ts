import { apiClient } from "@/lib/apiClient";
import type {
  AnalysisHistoryResponse,
  AnalyzeResumeResponse,
  ResumeAnalysis,
} from "@/types/api";

export async function analyzeResume(resumeId: string): Promise<ResumeAnalysis> {
  const { data } = await apiClient.post<AnalyzeResumeResponse>(`/analysis/resume/${resumeId}`);
  return data.analysis;
}

export async function getAnalysisHistory(resumeId: string): Promise<ResumeAnalysis[]> {
  const { data } = await apiClient.get<AnalysisHistoryResponse>(`/analysis/resume/${resumeId}`);
  return data.analyses;
}
