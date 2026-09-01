import { useState } from "react";
import type { FormEvent } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiRequestError } from "@/lib/apiClient";
import * as interviewService from "@/services/interview.service";
import type { InterviewSession, JobDescription, Resume } from "@/types/api";

interface InterviewSetupFormProps {
  resumes: Resume[];
  jobDescriptions: JobDescription[];
  onCreated: (session: InterviewSession) => void;
}

export function InterviewSetupForm({
  resumes,
  jobDescriptions,
  onCreated,
}: InterviewSetupFormProps) {
  const [resumeId, setResumeId] = useState("");
  const [jobId, setJobId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!resumeId) {
      setError("Select a resume to generate interview questions");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const session = await interviewService.generateInterviewSession({
        resumeId,
        jobId: jobId || undefined,
        targetRole: targetRole.trim() || undefined,
      });
      onCreated(session);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Unable to generate interview questions"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (resumes.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Upload a resume first"
          description="Interview questions are generated from your resume, so upload one before starting a session."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Start a New Session"
        description="Generate interview questions tailored to your resume and target role"
      />
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <Select label="Resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)} required>
          <option value="" disabled>
            Select a resume
          </option>
          {resumes.map((resume) => (
            <option key={resume.resumeId} value={resume.resumeId}>
              {resume.fileName}
            </option>
          ))}
        </Select>

        <Select
          label="Job description (optional)"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
        >
          <option value="">None</option>
          {jobDescriptions.map((job) => (
            <option key={job.jobId} value={job.jobId}>
              {job.title}
            </option>
          ))}
        </Select>

        <Input
          label="Target role (optional)"
          placeholder="e.g. Senior Frontend Developer"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
        />

        <Button type="submit" isLoading={isSubmitting} className="self-start">
          Generate Questions
        </Button>
      </form>
    </Card>
  );
}
