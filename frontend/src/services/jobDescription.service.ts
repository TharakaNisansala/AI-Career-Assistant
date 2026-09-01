import { apiClient } from "@/lib/apiClient";
import type {
  JobDescription,
  ListJobDescriptionsResponse,
  SubmitJobDescriptionResponse,
} from "@/types/api";

export interface SubmitJobDescriptionInput {
  title: string;
  description: string;
}

export async function submitJobDescription(
  input: SubmitJobDescriptionInput
): Promise<JobDescription> {
  const { data } = await apiClient.post<SubmitJobDescriptionResponse>(
    "/job-descriptions",
    input
  );
  return data.jobDescription;
}

export async function listJobDescriptions(): Promise<JobDescription[]> {
  const { data } = await apiClient.get<ListJobDescriptionsResponse>("/job-descriptions");
  return data.jobDescriptions;
}
