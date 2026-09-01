import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as authService from "@/services/auth.service";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/constants";
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
  const [isInitializing, setIsInitializing] = useState(
    () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) !== null
  );

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      return;
    }

    authService
      .getCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      })
      .finally(() => setIsInitializing(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await authService.login({ email, password });
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
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
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
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
