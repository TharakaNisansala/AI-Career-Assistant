import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatFileSize } from "@/lib/format";
import { ApiRequestError } from "@/lib/apiClient";
import * as resumeService from "@/services/resume.service";
import type { Resume } from "@/types/api";

interface ResumeListCardProps {
  resumes: Resume[];
  isLoading: boolean;
  error: string | null;
  onChanged: () => void;
}

export function ResumeListCard({ resumes, isLoading, error, onChanged }: ResumeListCardProps) {
  const [pendingDelete, setPendingDelete] = useState<Resume | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await resumeService.deleteResume(pendingDelete.resumeId);
      setPendingDelete(null);
      onChanged();
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : "Unable to delete resume");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Your Resumes" description="Select a resume to analyze or delete it" />

      {isLoading && (
        <div className="flex justify-center py-8 text-indigo-600">
          <Spinner />
        </div>
      )}

      {!isLoading && error && <Alert variant="error">{error}</Alert>}

      {!isLoading && !error && resumes.length === 0 && (
        <EmptyState
          title="No resumes uploaded yet"
          description="Upload a PDF or DOCX resume to get started with AI analysis."
        />
      )}

      {!isLoading && !error && resumes.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {resumes.map((resume) => (
            <li
              key={resume.resumeId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{resume.fileName}</p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(resume.fileSize)} &middot; Uploaded{" "}
                  {formatDate(resume.uploadedAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link to={`/resumes/${resume.resumeId}/analysis`}>
                  <Button size="sm" variant="secondary">
                    Analyze
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setDeleteError(null);
                    setPendingDelete(resume);
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={pendingDelete !== null}
        title="Delete resume"
        onClose={() => setPendingDelete(null)}
      >
        <p>
          Are you sure you want to delete <strong>{pendingDelete?.fileName}</strong>? This will
          also remove its analysis history and cannot be undone.
        </p>
        {deleteError && (
          <div className="mt-3">
            <Alert variant="error">{deleteError}</Alert>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
