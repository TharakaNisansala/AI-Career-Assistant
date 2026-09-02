import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as authService from "@/services/auth.service";
import { apiClient, setAccessToken } from "@/lib/apiClient";
import type { User } from "@/types/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // The access token lives only in memory (see apiClient.ts), so a full
    // page reload always loses it. Recover the session, if any, from the
    // httpOnly refresh cookie instead of a localStorage read.
    apiClient
      .post<{ token: string }>("/auth/refresh")
      .then(async (response) => {
        setAccessToken(response.data.token);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      })
      .catch(() => {
        setAccessToken(null);
      })
      .finally(() => setIsInitializing(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await authService.login({ email, password });
    setAccessToken(token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await authService.register({ name, email, password });
    // Registration doesn't return a session token, so log in right after
    // with the same credentials to get the user straight into the app.
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    // Best-effort: revoke the token server-side so it can't be reused if it
    // was ever stolen, but don't let a network failure stop the client from
    // clearing its own session.
    authService.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isInitializing,
      login,
      register,
      logout,
    }),
    [user, isInitializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
