import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { AnalysisDetail } from "@/components/analysis/AnalysisDetail";
import { useAsync } from "@/hooks/useAsync";
import { formatDateTime } from "@/lib/format";
import * as resumeService from "@/services/resume.service";
import * as analysisService from "@/services/analysis.service";

export function AnalysisHistoryPage() {
  const fetchResumes = useCallback(() => resumeService.listResumes(), []);
  const { data: resumes, isLoading: isLoadingResumes } = useAsync(fetchResumes);

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);

  const effectiveResumeId = selectedResumeId ?? resumes?.[0]?.resumeId ?? "";

  const fetchHistory = useCallback(() => {
    if (!effectiveResumeId) return Promise.resolve([]);
    return analysisService.getAnalysisHistory(effectiveResumeId);
  }, [effectiveResumeId]);
  const { data: history, error, isLoading } = useAsync(fetchHistory, [effectiveResumeId]);

  const expandedAnalysis = useMemo(
    () => history?.find((a) => a.analysisId === expandedAnalysisId) ?? null,
    [history, expandedAnalysisId]
  );

  return (
    <div>
      <PageHeader
        title="Analysis History"
        description="Review every AI analysis run for each of your resumes"
      />

      {!isLoadingResumes && (!resumes || resumes.length === 0) && (
        <EmptyState
          title="No resumes yet"
          description="Upload a resume first to start building analysis history."
          action={
            <Link to="/resumes">
              <Button>Go to Resumes</Button>
            </Link>
          }
        />
      )}

      {resumes && resumes.length > 0 && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="max-w-sm">
              <Select
                label="Resume"
                value={effectiveResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  setExpandedAnalysisId(null);
                }}
              >
                {resumes.map((resume) => (
                  <option key={resume.resumeId} value={resume.resumeId}>
                    {resume.fileName}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          {isLoading && (
            <div className="flex justify-center py-8 text-indigo-600">
              <Spinner />
            </div>
          )}

          {!isLoading && error && <Alert variant="error">{error}</Alert>}

          {!isLoading && !error && history && history.length === 0 && (
            <EmptyState
              title="No analyses yet for this resume"
              description="Run an analysis from the Resume Analysis page to see it here."
            />
          )}

          {!isLoading && !error && history && history.length > 0 && (
            <Card>
              <ul className="divide-y divide-slate-100">
                {history.map((item) => (
                  <li key={item.analysisId} className="py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAnalysisId(
                          expandedAnalysisId === item.analysisId ? null : item.analysisId
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 text-left"
                      aria-expanded={expandedAnalysisId === item.analysisId}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          ATS Score: {item.atsScore}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-indigo-600">
                        {expandedAnalysisId === item.analysisId ? "Hide details" : "View details"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {expandedAnalysis && <AnalysisDetail analysis={expandedAnalysis} />}
        </div>
      )}
    </div>
  );
}
