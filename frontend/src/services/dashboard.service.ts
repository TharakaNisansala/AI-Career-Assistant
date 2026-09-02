import { apiClient } from "@/lib/apiClient";
import type { JobMatch, ResumeAnalysis } from "@/types/api";

export interface DashboardSummaryResponse {
  status: "success";
  totalResumes: number;
  recentAnalyses: ResumeAnalysis[];
  latestAnalysis: ResumeAnalysis | null;
  latestMatch: JobMatch | null;
}

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const { data } = await apiClient.get<DashboardSummaryResponse>("/dashboard/summary");
  return data;
}
