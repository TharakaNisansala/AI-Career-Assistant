import { useCallback } from "react";
import { useAsync } from "@/hooks/useAsync";
import * as dashboardService from "@/services/dashboard.service";
import type { JobMatch, ResumeAnalysis } from "@/types/api";

export interface DashboardData {
  totalResumes: number;
  recentAnalyses: ResumeAnalysis[];
  latestAnalysis: ResumeAnalysis | null;
  latestMatch: JobMatch | null;
}

// A single GET /dashboard/summary call, computed server-side (see
// server/src/services/dashboard.service.js), replacing what used to be a
// client-side fan-out: list every resume, fetch analysis history per resume,
// list job descriptions, then fetch one job match history.
async function loadDashboardData(): Promise<DashboardData> {
  const { totalResumes, recentAnalyses, latestAnalysis, latestMatch } =
    await dashboardService.getDashboardSummary();
  return { totalResumes, recentAnalyses, latestAnalysis, latestMatch };
}

export function useDashboardData() {
  const fetcher = useCallback(() => loadDashboardData(), []);
  return useAsync(fetcher, [], "dashboard-summary");
}
