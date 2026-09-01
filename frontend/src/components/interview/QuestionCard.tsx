import { useState } from "react";
import type { FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { getScoreLevel, SCORE_TEXT_CLASSES } from "@/lib/score";
import { ApiRequestError } from "@/lib/apiClient";
import { validateAnswerText } from "@/lib/validation";
import * as interviewService from "@/services/interview.service";
import type { InterviewAnswer, InterviewQuestion } from "@/types/api";

interface QuestionCardProps {
  sessionId: string;
  question: InterviewQuestion;
  answer: InterviewAnswer | undefined;
  onAnswered: (answer: InterviewAnswer) => void;
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-xs text-slate-600">
            &bull; {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QuestionCard({ sessionId, question, answer, onAnswered }: QuestionCardProps) {
  const [answerText, setAnswerText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateAnswerText(answerText);
    setValidationError(validation);
    if (validation) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await interviewService.submitInterviewAnswer(
        sessionId,
        question.questionId,
        answerText
      );
      onAnswered(result);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Unable to evaluate answer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{question.question}</p>
        <div className="flex shrink-0 gap-1.5">
          <Badge variant={question.type === "technical" ? "info" : "neutral"}>
            {question.type}
          </Badge>
          {question.category && <Badge>{question.category}</Badge>}
        </div>
      </div>

      {answer ? (
        <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">{answer.answerText}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Score:</span>
            <span className={`text-sm font-bold ${SCORE_TEXT_CLASSES[getScoreLevel(answer.score)]}`}>
              {answer.score}/100
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FeedbackList title="Strengths" items={answer.strengths} />
            <FeedbackList title="Weaknesses" items={answer.weaknesses} />
            <FeedbackList title="Suggestions" items={answer.suggestions} />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          {error && <Alert variant="error">{error}</Alert>}
          <TextArea
            label="Your answer"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            error={validationError}
            hint="At least 10 characters"
            rows={4}
          />
          <Button type="submit" size="sm" isLoading={isSubmitting} className="self-start">
            Submit Answer
          </Button>
        </form>
      )}
    </Card>
  );
}
