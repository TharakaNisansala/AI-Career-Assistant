import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatDateTime } from "@/lib/format";

export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading } = useDashboardData();

  return (
    <div>
      <PageHeader
        title={`Welcome back${user ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Here's a snapshot of your job search progress"
      />

      {isLoading && (
        <div className="flex justify-center py-16 text-indigo-600">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Card className="flex items-center gap-4">
              {data.latestAnalysis ? (
                <ScoreGauge score={data.latestAnalysis.atsScore} size={80} />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
                  N/A
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500">Latest ATS Score</p>
                <p className="text-sm text-slate-700">
                  {data.latestAnalysis
                    ? formatDateTime(data.latestAnalysis.createdAt)
                    : "No analysis run yet"}
                </p>
              </div>
            </Card>

            <Card className="flex flex-col justify-center">
              <p className="text-3xl font-bold text-slate-900">{data.totalResumes}</p>
              <p className="text-xs font-medium text-slate-500">Resumes Uploaded</p>
            </Card>

            <Card className="flex flex-col justify-center">
              <p className="text-3xl font-bold text-slate-900">
                {data.latestMatch ? `${data.latestMatch.matchPercentage}%` : "N/A"}
              </p>
              <p className="text-xs font-medium text-slate-500">Latest Job Match</p>
            </Card>
          </div>

          <Card>
            <CardHeader title="Quick Actions" />
            <div className="flex flex-wrap gap-3">
              <Link to="/resumes">
                <Button variant="secondary">Upload Resume</Button>
              </Link>
              <Link to="/job-matching">
                <Button variant="secondary">Match a Job Description</Button>
              </Link>
              <Link to="/interview-prep">
                <Button variant="secondary">Start Interview Prep</Button>
              </Link>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Recent Analyses"
                action={
                  <Link to="/history" className="text-xs font-medium text-indigo-600">
                    View all
                  </Link>
                }
              />
              {data.recentAnalyses.length === 0 ? (
                <EmptyState
                  title="No analyses yet"
                  description="Upload a resume and run an analysis to see your ATS score here."
                  action={
                    <Link to="/resumes">
                      <Button size="sm">Go to Resumes</Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentAnalyses.map((analysis) => (
                    <li key={analysis.analysisId} className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-slate-500">
                        {formatDateTime(analysis.createdAt)}
                      </span>
                      <Badge variant={analysis.atsScore >= 80 ? "success" : analysis.atsScore >= 50 ? "warning" : "danger"}>
                        ATS {analysis.atsScore}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Job Match Results"
                action={
                  <Link to="/job-matching" className="text-xs font-medium text-indigo-600">
                    Run a match
                  </Link>
                }
              />
              {!data.latestMatch ? (
                <EmptyState
                  title="No job matches yet"
                  description="Add a job description and match it against a resume to see results here."
                  action={
                    <Link to="/job-matching">
                      <Button size="sm">Go to Job Matching</Button>
                    </Link>
                  }
                />
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {data.latestMatch.matchPercentage}% match
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(data.latestMatch.createdAt)}
                  </p>
                  {data.latestMatch.matchedSkills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {data.latestMatch.matchedSkills.slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="success">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
