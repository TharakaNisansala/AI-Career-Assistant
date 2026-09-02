import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { GuestRoute } from "@/components/layout/GuestRoute";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { Spinner } from "@/components/ui/Spinner";

// Code-split per page so the initial bundle only pays for the login/register
// screens most visits start on, not the entire authenticated app up front.
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import("@/pages/RegisterPage").then((m) => ({ default: m.RegisterPage }))
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const ResumesPage = lazy(() =>
  import("@/pages/ResumesPage").then((m) => ({ default: m.ResumesPage }))
);
const ResumeAnalysisPage = lazy(() =>
  import("@/pages/ResumeAnalysisPage").then((m) => ({ default: m.ResumeAnalysisPage }))
);
const JobMatchingPage = lazy(() =>
  import("@/pages/JobMatchingPage").then((m) => ({ default: m.JobMatchingPage }))
);
const InterviewPrepPage = lazy(() =>
  import("@/pages/InterviewPrepPage").then((m) => ({ default: m.InterviewPrepPage }))
);
const InterviewSessionPage = lazy(() =>
  import("@/pages/InterviewSessionPage").then((m) => ({ default: m.InterviewSessionPage }))
);
const AnalysisHistoryPage = lazy(() =>
  import("@/pages/AnalysisHistoryPage").then((m) => ({ default: m.AnalysisHistoryPage }))
);
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-indigo-600">
      <Spinner size="lg" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/resumes" element={<ResumesPage />} />
                  <Route path="/resumes/:resumeId/analysis" element={<ResumeAnalysisPage />} />
                  <Route path="/job-matching" element={<JobMatchingPage />} />
                  <Route path="/interview-prep" element={<InterviewPrepPage />} />
                  <Route path="/interview-prep/:sessionId" element={<InterviewSessionPage />} />
                  <Route path="/history" element={<AnalysisHistoryPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
