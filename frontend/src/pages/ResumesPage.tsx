import { useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResumeUploadCard } from "@/components/resume/ResumeUploadCard";
import { ResumeListCard } from "@/components/resume/ResumeListCard";
import { useAsync } from "@/hooks/useAsync";
import * as resumeService from "@/services/resume.service";

export function ResumesPage() {
  const fetchResumes = useCallback(() => resumeService.listResumes(), []);
  const { data: resumes, error, isLoading, refetch } = useAsync(fetchResumes, [], "resumes-list");

  return (
    <div>
      <PageHeader
        title="Resume Management"
        description="Upload, review, and manage your resumes"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <ResumeUploadCard onUploaded={refetch} />
        <ResumeListCard
          resumes={resumes ?? []}
          isLoading={isLoading}
          error={error}
          onChanged={refetch}
        />
      </div>
    </div>
  );
}
