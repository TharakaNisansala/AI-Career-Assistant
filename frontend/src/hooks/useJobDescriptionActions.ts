import { useAsyncAction } from "@/hooks/useAsyncAction";
import * as jobDescriptionService from "@/services/jobDescription.service";

export function useSubmitJobDescription() {
  return useAsyncAction(jobDescriptionService.submitJobDescription);
}
