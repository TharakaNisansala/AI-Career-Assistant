import { useCallback } from "react";
import { useAsync } from "@/hooks/useAsync";
import * as resumeService from "@/services/resume.service";
import * as analysisService from "@/services/analysis.service";
import * as jobDescriptionService from "@/services/jobDescription.service";
import * as jobMatchService from "@/services/jobMatch.service";
import type { JobMatch, Resume, ResumeAnalysis } from "@/types/api";

export interface DashboardData {
  resumes: Resume[];
  recentAnalyses: ResumeAnalysis[];
  latestAnalysis: ResumeAnalysis | null;
  latestMatch: JobMatch | null;
}

// Aggregates data for the dashboard from several list/detail endpoints since
// the API has no single "dashboard summary" endpoint. Analysis history is
// only queryable per resume, so this pulls it for a handful of the most
// recently uploaded resumes and merges the results client-side; the "latest
// job match" is looked up for the most recent resume/job pair only, since
// job match history also requires both ids.
const RESUMES_TO_SAMPLE_FOR_ANALYSES = 5;
const RECENT_ANALYSES_LIMIT = 5;

async function loadDashboardData(): Promise<DashboardData> {
  const resumes = await resumeService.listResumes();

  const sampledResumes = resumes.slice(0, RESUMES_TO_SAMPLE_FOR_ANALYSES);
  const historyPerResume = await Promise.all(
    sampledResumes.map((resume) => analysisService.getAnalysisHistory(resume.resumeId))
  );
  const recentAnalyses = historyPerResume
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_ANALYSES_LIMIT);

  let latestMatch: JobMatch | null = null;
  if (resumes.length > 0) {
    const jobDescriptions = await jobDescriptionService.listJobDescriptions();
    if (jobDescriptions.length > 0) {
      const matches = await jobMatchService.getJobMatchHistory(
        jobDescriptions[0].jobId,
        resumes[0].resumeId
      );
      latestMatch = matches[0] ?? null;
    }
  }

  return {
    resumes,
    recentAnalyses,
    latestAnalysis: recentAnalyses[0] ?? null,
    latestMatch,
  };
}

export function useDashboardData() {
  const fetcher = useCallback(() => loadDashboardData(), []);
  return useAsync(fetcher);
}
