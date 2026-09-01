import { apiClient } from "@/lib/apiClient";
import type {
  CurrentUserResponse,
  LoginResponse,
  RegisterResponse,
  User,
} from "@/types/api";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>("/auth/register", input);
  return data;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", input);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<CurrentUserResponse>("/auth/me");
  return data.user;
}
