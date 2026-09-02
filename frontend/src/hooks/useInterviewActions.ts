import { useAsyncAction } from "@/hooks/useAsyncAction";
import * as interviewService from "@/services/interview.service";

export function useGenerateInterviewSession() {
  return useAsyncAction(interviewService.generateInterviewSession);
}

export function useSubmitInterviewAnswer() {
  return useAsyncAction(interviewService.submitInterviewAnswer);
}
