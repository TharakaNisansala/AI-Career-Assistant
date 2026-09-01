import { apiClient } from "@/lib/apiClient";
import type {
  ListResumesResponse,
  Resume,
  ResumeTextResponse,
  UploadResumeResponse,
} from "@/types/api";

export async function uploadResume(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append("resume", file);

  const { data } = await apiClient.post<UploadResumeResponse>("/resumes/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.resume;
}

export async function listResumes(): Promise<Resume[]> {
  const { data } = await apiClient.get<ListResumesResponse>("/resumes");
  return data.resumes;
}

export async function getResumeText(resumeId: string): Promise<ResumeTextResponse> {
  const { data } = await apiClient.get<ResumeTextResponse>(`/resumes/${resumeId}/text`);
  return data;
}

export async function deleteResume(resumeId: string): Promise<void> {
  await apiClient.delete(`/resumes/${resumeId}`);
}
