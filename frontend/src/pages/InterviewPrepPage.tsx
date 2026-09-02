import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { InterviewSetupForm } from "@/components/interview/InterviewSetupForm";
import { useAsync } from "@/hooks/useAsync";
import { formatDateTime } from "@/lib/format";
import * as resumeService from "@/services/resume.service";
import * as jobDescriptionService from "@/services/jobDescription.service";
import * as interviewService from "@/services/interview.service";

export function InterviewPrepPage() {
  const navigate = useNavigate();

  const fetchResumes = useCallback(() => resumeService.listResumes(), []);
  const { data: resumes } = useAsync(fetchResumes, [], "resumes-list");

  const fetchJobs = useCallback(() => jobDescriptionService.listJobDescriptions(), []);
  const { data: jobDescriptions } = useAsync(fetchJobs, [], "job-descriptions-list");

  const fetchSessions = useCallback(() => interviewService.listInterviewSessions(), []);
  const { data: sessions, isLoading, error } = useAsync(
    fetchSessions,
    [],
    "interview-sessions-list"
  );

  return (
    <div>
      <PageHeader
        title="Interview Preparation"
        description="Generate tailored interview questions and get AI feedback on your answers"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <InterviewSetupForm
          resumes={resumes ?? []}
          jobDescriptions={jobDescriptions ?? []}
          onCreated={(session) => navigate(`/interview-prep/${session.sessionId}`)}
        />

        <Card>
          <CardHeader title="Past Sessions" />

          {isLoading && (
            <div className="flex justify-center py-8 text-indigo-600">
              <Spinner />
            </div>
          )}

          {!isLoading && error && <Alert variant="error">{error}</Alert>}

          {!isLoading && !error && sessions && sessions.length === 0 && (
            <EmptyState
              title="No interview sessions yet"
              description="Generate your first set of questions to start practicing."
            />
          )}

          {!isLoading && !error && sessions && sessions.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <li key={session.sessionId} className="py-3">
                  <Link
                    to={`/interview-prep/${session.sessionId}`}
                    className="flex items-center justify-between gap-3 hover:text-indigo-600"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {session.targetRole || "General interview practice"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {session.questions.length} questions &middot;{" "}
                        {formatDateTime(session.createdAt)}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-indigo-600">View &rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
