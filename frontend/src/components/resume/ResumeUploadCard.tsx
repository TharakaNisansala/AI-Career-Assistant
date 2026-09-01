import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  ALLOWED_RESUME_EXTENSIONS,
  MAX_RESUME_FILE_SIZE_BYTES,
  MAX_RESUME_FILE_SIZE_MB,
} from "@/lib/constants";
import { formatFileSize } from "@/lib/format";
import { ApiRequestError } from "@/lib/apiClient";
import * as resumeService from "@/services/resume.service";

interface ResumeUploadCardProps {
  onUploaded: () => void;
}

function validateFile(file: File): string | undefined {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_RESUME_EXTENSIONS.includes(extension)) {
    return "Only PDF and DOCX files are allowed";
  }
  if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${MAX_RESUME_FILE_SIZE_MB}MB`;
  }
  return undefined;
}

export function ResumeUploadCard({ onUploaded }: ResumeUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChosen(file: File | undefined) {
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFileChosen(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFileChosen(event.dataTransfer.files?.[0]);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setError(null);
    setIsUploading(true);
    try {
      await resumeService.uploadResume(selectedFile);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (uploadError) {
      setError(
        uploadError instanceof ApiRequestError ? uploadError.message : "Unable to upload resume"
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Upload Resume"
        description="PDF or DOCX, up to 5MB"
      />

      {error && (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors ${
          isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-300"
        }`}
      >
        <p className="text-sm text-slate-600">
          Drag and drop a resume here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            browse
          </button>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_RESUME_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          className="sr-only"
          aria-label="Resume file"
        />
        {selectedFile && (
          <p className="mt-2 text-xs text-slate-500">
            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        )}
      </div>

      <Button
        className="mt-4 w-full"
        onClick={handleUpload}
        disabled={!selectedFile}
        isLoading={isUploading}
      >
        Upload Resume
      </Button>
    </Card>
  );
}
