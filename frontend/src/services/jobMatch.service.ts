import { apiClient } from "@/lib/apiClient";
import type { JobMatch, JobMatchHistoryResponse, RunJobMatchResponse } from "@/types/api";

export async function runJobMatch(jobId: string, resumeId: string): Promise<JobMatch> {
  const { data } = await apiClient.post<RunJobMatchResponse>(
    `/job-match/${jobId}/resume/${resumeId}`
  );
  return data.match;
}

export async function getJobMatchHistory(jobId: string, resumeId: string): Promise<JobMatch[]> {
  const { data } = await apiClient.get<JobMatchHistoryResponse>(
    `/job-match/${jobId}/resume/${resumeId}`
  );
  return data.matches;
}
