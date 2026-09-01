import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { JobDescriptionPanel } from "@/components/jobMatch/JobDescriptionPanel";
import { JobMatchResultCard } from "@/components/jobMatch/JobMatchResultCard";
import { useAsync } from "@/hooks/useAsync";
import { ApiRequestError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import * as resumeService from "@/services/resume.service";
import * as jobDescriptionService from "@/services/jobDescription.service";
import * as jobMatchService from "@/services/jobMatch.service";
import type { JobMatch } from "@/types/api";

export function JobMatchingPage() {
  const fetchJobDescriptions = useCallback(() => jobDescriptionService.listJobDescriptions(), []);
  const {
    data: jobDescriptions,
    isLoading: isLoadingJobs,
    error: jobsError,
    refetch: refetchJobs,
  } = useAsync(fetchJobDescriptions);

  const fetchResumes = useCallback(() => resumeService.listResumes(), []);
  const { data: resumes, isLoading: isLoadingResumes } = useAsync(fetchResumes);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [match, setMatch] = useState<JobMatch | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  const fetchHistory = useCallback(() => {
    if (!selectedJobId || !selectedResumeId) return Promise.resolve([]);
    return jobMatchService.getJobMatchHistory(selectedJobId, selectedResumeId);
  }, [selectedJobId, selectedResumeId]);
  const { data: history, refetch: refetchHistory } = useAsync(fetchHistory, [
    selectedJobId,
    selectedResumeId,
  ]);

  const selectedJobTitle = useMemo(
    () => jobDescriptions?.find((j) => j.jobId === selectedJobId)?.title,
    [jobDescriptions, selectedJobId]
  );

  async function handleRunMatch() {
    if (!selectedJobId || !selectedResumeId) return;
    setMatchError(null);
    setIsMatching(true);
    try {
      const result = await jobMatchService.runJobMatch(selectedJobId, selectedResumeId);
      setMatch(result);
      await refetchHistory();
    } catch (err) {
      setMatchError(err instanceof ApiRequestError ? err.message : "Unable to run job match");
    } finally {
      setIsMatching(false);
    }
  }

  const canRunMatch = Boolean(selectedJobId && selectedResumeId) && !isMatching;

  return (
    <div>
      <PageHeader
        title="Job Matching"
        description="Compare a resume against a job description to see how well it fits"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="flex flex-col gap-6">
          <JobDescriptionPanel
            jobDescriptions={jobDescriptions ?? []}
            isLoading={isLoadingJobs}
            error={jobsError}
            selectedJobId={selectedJobId}
            onSelect={(jobId) => {
              setSelectedJobId(jobId);
              setMatch(null);
            }}
            onCreated={(job) => {
              setSelectedJobId(job.jobId);
              setMatch(null);
              refetchJobs();
            }}
          />

          <Card>
            <CardHeader title="Resume" description="Choose which resume to match" />
            {isLoadingResumes ? (
              <div className="flex justify-center py-4 text-indigo-600">
                <Spinner />
              </div>
            ) : resumes && resumes.length > 0 ? (
              <Select
                label="Resume"
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  setMatch(null);
                }}
              >
                <option value="" disabled>
                  Select a resume
                </option>
                {resumes.map((resume) => (
                  <option key={resume.resumeId} value={resume.resumeId}>
                    {resume.fileName}
                  </option>
                ))}
              </Select>
            ) : (
              <EmptyState title="No resumes uploaded" description="Upload a resume first." />
            )}

            <Button className="mt-4 w-full" disabled={!canRunMatch} isLoading={isMatching} onClick={handleRunMatch}>
              Run Job Match
            </Button>
          </Card>

          {history && history.length > 0 && (
            <Card>
              <CardHeader title="Match History" description={selectedJobTitle} />
              <ul className="flex flex-col gap-2">
                {history.map((item) => (
                  <li key={item.matchId}>
                    <button
                      type="button"
                      onClick={() => setMatch(item)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        match?.matchId === item.matchId
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-medium text-slate-800">
                        {item.matchPercentage}% match
                      </span>{" "}
                      <span className="text-xs text-slate-500">
                        &middot; {formatDateTime(item.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div>
          {matchError && (
            <div className="mb-4">
              <Alert variant="error">{matchError}</Alert>
            </div>
          )}

          {!match && !matchError && (
            <EmptyState
              title="No match yet"
              description="Select a job description and a resume, then run a match to see your results."
            />
          )}

          {match && <JobMatchResultCard match={match} />}
        </div>
      </div>
    </div>
  );
}
