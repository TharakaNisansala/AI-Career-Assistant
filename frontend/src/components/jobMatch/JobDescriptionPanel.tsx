import { useState } from "react";
import type { FormEvent } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/format";
import { validateJobDescriptionText, validateJobTitle } from "@/lib/validation";
import { useSubmitJobDescription } from "@/hooks/useJobDescriptionActions";
import type { JobDescription } from "@/types/api";

interface JobDescriptionPanelProps {
  jobDescriptions: JobDescription[];
  isLoading: boolean;
  error: string | null;
  selectedJobId: string | null;
  onSelect: (jobId: string) => void;
  onCreated: (job: JobDescription) => void;
}

interface FieldErrors {
  title?: string;
  description?: string;
}

export function JobDescriptionPanel({
  jobDescriptions,
  isLoading,
  error,
  selectedJobId,
  onSelect,
  onCreated,
}: JobDescriptionPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(jobDescriptions.length === 0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { run: submitJobDescription, isSubmitting, error: formError } = useSubmitJobDescription();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: FieldErrors = {
      title: validateJobTitle(title),
      description: validateJobDescriptionText(description),
    };
    setFieldErrors(errors);
    if (errors.title || errors.description) return;

    try {
      const job = await submitJobDescription({ title, description });
      setTitle("");
      setDescription("");
      setIsFormOpen(false);
      onCreated(job);
    } catch {
      // Surfaced via formError above.
    }
  }

  return (
    <Card>
      <CardHeader
        title="Job Description"
        description="Select a saved job posting or add a new one"
        action={
          <Button size="sm" variant="secondary" onClick={() => setIsFormOpen((open) => !open)}>
            {isFormOpen ? "Cancel" : "Add New"}
          </Button>
        }
      />

      {isFormOpen && (
        <form className="mb-5 flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
          {formError && <Alert variant="error">{formError}</Alert>}
          <Input
            label="Job title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
            required
          />
          <TextArea
            label="Job description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description}
            hint="At least 20 characters"
            required
          />
          <Button type="submit" isLoading={isSubmitting} className="self-start">
            Save Job Description
          </Button>
        </form>
      )}

      {isLoading && (
        <div className="flex justify-center py-6 text-indigo-600">
          <Spinner />
        </div>
      )}

      {!isLoading && error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && jobDescriptions.length === 0 && !isFormOpen && (
        <EmptyState
          title="No job descriptions yet"
          description="Add a job description to start matching it against your resumes."
        />
      )}

      {!isLoading && !error && jobDescriptions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {jobDescriptions.map((job) => (
            <li key={job.jobId}>
              <button
                type="button"
                onClick={() => onSelect(job.jobId)}
                aria-pressed={selectedJobId === job.jobId}
                className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                  selectedJobId === job.jobId
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-medium text-slate-800">{job.title}</p>
                <p className="text-xs text-slate-500">Added {formatDate(job.createdAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
