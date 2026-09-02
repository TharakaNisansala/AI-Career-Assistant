import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse } from "@/types/api";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Lets the browser send/receive the httpOnly refresh-token cookie set by
  // POST /auth/login and /auth/refresh, even though the API runs on a
  // different port than the frontend dev server.
  withCredentials: true,
});

// The access token lives in memory only, never in localStorage: an XSS bug
// anywhere in the SPA could read localStorage but can't read this module's
// closure. It's naturally lost on a full page reload; AuthProvider recovers
// it on mount via POST /auth/refresh, which relies on the httpOnly cookie
// instead.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
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

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

const AUTH_ENDPOINTS_WITHOUT_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh"];

// Shared by every concurrent 401 so a burst of requests whose token expired
// at the same moment triggers exactly one /auth/refresh call, not one per
// request.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<{ token: string }>("/auth/refresh")
      .then((response) => {
        accessToken = response.data.token;
        return accessToken;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const isAuthEndpoint = AUTH_ENDPOINTS_WITHOUT_REFRESH.some((path) =>
      originalRequest?.url?.includes(path)
    );

    // A 401 from login/register/refresh itself (wrong password, expired
    // refresh cookie, ...) is a normal response for the caller to handle,
    // not a signal that a *previously* logged-in session just expired.
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retriedAfterRefresh &&
      !isAuthEndpoint
    ) {
      originalRequest._retriedAfterRefresh = true;
      const newToken = await refreshAccessToken();

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }

    if (error.response) {
      const { status, data } = error.response;
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
