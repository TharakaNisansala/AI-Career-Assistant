import axios, { AxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/constants";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Type of the error thrown from every apiClient call: always a message the
// UI can show directly, regardless of whether the backend responded with a
// structured error body, a non-JSON error, or the request never reached it.
export class ApiRequestError extends Error {
  status?: number;
  errors?: string[];

  constructor(message: string, status?: number, errors?: string[]) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errors = errors;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        if (!window.location.pathname.startsWith("/login")) {
          window.location.assign("/login");
        }
      }

      const message = data?.message || "Something went wrong. Please try again.";
      return Promise.reject(new ApiRequestError(message, status, data?.errors));
    }

    if (error.request) {
      return Promise.reject(
        new ApiRequestError("Unable to reach the server. Check your connection and try again.")
      );
    }

    return Promise.reject(new ApiRequestError(error.message || "Unexpected error"));
  }
);
