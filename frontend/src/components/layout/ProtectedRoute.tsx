import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/Spinner";

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-indigo-600">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Carries the page the user was trying to reach so LoginPage can send
    // them back to it after a successful login instead of always to "/".
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" state={{ from }} replace />;
  }

  return <Outlet />;
}
