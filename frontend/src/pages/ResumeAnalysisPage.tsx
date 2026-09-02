import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { AnalysisDetail } from "@/components/analysis/AnalysisDetail";
import { useAsync } from "@/hooks/useAsync";
import { ApiRequestError } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import * as resumeService from "@/services/resume.service";
import * as analysisService from "@/services/analysis.service";

export function ResumeAnalysisPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const fetchResumes = useCallback(() => resumeService.listResumes(), []);
  const { data: resumes } = useAsync(fetchResumes, [], "resumes-list");
  const resume = useMemo(
    () => resumes?.find((r) => r.resumeId === resumeId) ?? null,
    [resumes, resumeId]
  );

  const fetchHistory = useCallback(() => {
    if (!resumeId) return Promise.resolve([]);
    return analysisService.getAnalysisHistory(resumeId);
  }, [resumeId]);
  const { data: history, error, isLoading, refetch } = useAsync(
    fetchHistory,
    [resumeId],
    resumeId ? `analysis-history:${resumeId}` : undefined
  );

  const selectedAnalysis = useMemo(() => {
    if (!history || history.length === 0) return null;
    return history.find((a) => a.analysisId === selectedAnalysisId) ?? history[0];
  }, [history, selectedAnalysisId]);

  async function handleAnalyze() {
    if (!resumeId) return;
    setAnalyzeError(null);
    setIsAnalyzing(true);
    try {
      const analysis = await analysisService.analyzeResume(resumeId);
      setSelectedAnalysisId(analysis.analysisId);
      await refetch();
    } catch (err) {
      setAnalyzeError(err instanceof ApiRequestError ? err.message : "Unable to analyze resume");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!resumeId) {
    return <Alert variant="error">Missing resume id.</Alert>;
  }

  return (
    <div>
      <PageHeader
        title="Resume Analysis"
        description={resume ? resume.fileName : "AI-powered ATS scoring and feedback"}
        action={
          <div className="flex gap-2">
            <Link to="/resumes">
              <Button variant="secondary">Back to Resumes</Button>
            </Link>
            <Button onClick={handleAnalyze} isLoading={isAnalyzing}>
              Run New Analysis
            </Button>
          </div>
        }
      />

      {analyzeError && (
        <div className="mb-4">
          <Alert variant="error">{analyzeError}</Alert>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12 text-indigo-600">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && (!history || history.length === 0) && (
        <EmptyState
          title="No analysis yet"
          description="Run an AI analysis to see your ATS score, strengths, skills, and personalized recommendations."
          action={
            <Button onClick={handleAnalyze} isLoading={isAnalyzing}>
              Run New Analysis
            </Button>
          }
        />
      )}

      {!isLoading && !error && history && history.length > 0 && selectedAnalysis && (
        <div className="flex flex-col gap-4">
          {history.length > 1 && (
            <Card>
              <p className="mb-2 text-sm font-medium text-slate-700">Analysis history</p>
              <div className="flex flex-wrap gap-2">
                {history.map((item) => (
                  <button
                    key={item.analysisId}
                    type="button"
                    onClick={() => setSelectedAnalysisId(item.analysisId)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      item.analysisId === selectedAnalysis.analysisId
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {formatDateTime(item.createdAt)} &middot; {item.atsScore}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <AnalysisDetail analysis={selectedAnalysis} />
        </div>
      )}
    </div>
  );
}
