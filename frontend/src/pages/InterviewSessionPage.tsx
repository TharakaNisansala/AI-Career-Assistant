import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { QuestionCard } from "@/components/interview/QuestionCard";
import { useAsync } from "@/hooks/useAsync";
import * as interviewService from "@/services/interview.service";
import type { InterviewAnswer } from "@/types/api";

export function InterviewSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const fetchSession = useCallback(() => {
    if (!sessionId) return Promise.reject(new Error("Missing session id"));
    return interviewService.getInterviewSession(sessionId);
  }, [sessionId]);
  const { data, error, isLoading } = useAsync(fetchSession, [sessionId]);

  const [localAnswers, setLocalAnswers] = useState<Record<string, InterviewAnswer>>({});

  const answersByQuestionId = useMemo(() => {
    const map: Record<string, InterviewAnswer> = {};
    for (const answer of data?.answers ?? []) {
      map[answer.questionId] = answer;
    }
    return { ...map, ...localAnswers };
  }, [data?.answers, localAnswers]);

  if (!sessionId) {
    return <Alert variant="error">Missing session id.</Alert>;
  }

  const technicalQuestions = data?.session.questions.filter((q) => q.type === "technical") ?? [];
  const behavioralQuestions = data?.session.questions.filter((q) => q.type === "behavioral") ?? [];
  const answeredCount = data ? Object.keys(answersByQuestionId).length : 0;

  return (
    <div>
      <PageHeader
        title={data?.session.targetRole || "Interview Session"}
        description={
          data ? `${answeredCount} of ${data.session.questions.length} questions answered` : undefined
        }
        action={
          <Link to="/interview-prep">
            <Button variant="secondary">Back to Interview Prep</Button>
          </Link>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-12 text-indigo-600">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && data && (
        <div className="flex flex-col gap-6">
          {technicalQuestions.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-800">Technical Questions</h2>
              <div className="flex flex-col gap-4">
                {technicalQuestions.map((question) => (
                  <QuestionCard
                    key={question.questionId}
                    sessionId={sessionId}
                    question={question}
                    answer={answersByQuestionId[question.questionId]}
                    onAnswered={(answer) =>
                      setLocalAnswers((prev) => ({ ...prev, [answer.questionId]: answer }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {behavioralQuestions.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-800">Behavioral Questions</h2>
              <div className="flex flex-col gap-4">
                {behavioralQuestions.map((question) => (
                  <QuestionCard
                    key={question.questionId}
                    sessionId={sessionId}
                    question={question}
                    answer={answersByQuestionId[question.questionId]}
                    onAnswered={(answer) =>
                      setLocalAnswers((prev) => ({ ...prev, [answer.questionId]: answer }))
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
