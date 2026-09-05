import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as authService from "@/services/auth.service";
import { apiClient, setAccessToken } from "@/lib/apiClient";
import type { User } from "@/types/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  // True only for the render(s) right after a fresh registration in this
  // session; see the register()/clearJustRegistered() comments below for why
  // it lives here instead of being passed as router navigation state.
  justRegistered: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearJustRegistered: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

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

  // onUserSet lets register() below flip justRegistered in the very same
  // synchronous statement as setUser -- with no `await` between them, React
  // batches both updates into one commit. That matters because GuestRoute
  // (still mounted while register()'s promise chain runs) reacts to
  // isAuthenticated on its own and can redirect to "/" before RegisterPage's
  // own post-register navigate() ever fires; without this, DashboardPage
  // could mount via that redirect with justRegistered still false, a race
  // that isn't fixed by passing the flag through router state instead.
  const login = useCallback(async (email: string, password: string, onUserSet?: () => void) => {
    const { token } = await authService.login({ email, password });
    setAccessToken(token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    onUserSet?.();
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await authService.register({ name, email, password });
    // Registration doesn't return a session token, so log in right after
    // with the same credentials to get the user straight into the app.
    await login(email, password, () => setJustRegistered(true));
  }, [login]);

  // DashboardPage calls this once it has read justRegistered, so navigating
  // away and back to "/" later in the same session (no page reload) doesn't
  // keep showing the just-registered greeting. A hard refresh resets it too,
  // for free, since this is plain in-memory state.
  const clearJustRegistered = useCallback(() => setJustRegistered(false), []);

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
      justRegistered,
      login,
      register,
      logout,
      clearJustRegistered,
    }),
    [user, isInitializing, justRegistered, login, register, logout, clearJustRegistered]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
