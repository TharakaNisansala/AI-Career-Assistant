import { useAsyncAction } from "@/hooks/useAsyncAction";
import * as resumeService from "@/services/resume.service";

export function useUploadResume() {
  return useAsyncAction(resumeService.uploadResume);
}

export function useDeleteResume() {
  return useAsyncAction(resumeService.deleteResume);
}
