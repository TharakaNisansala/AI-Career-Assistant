import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { GuestRoute } from "@/components/layout/GuestRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ResumesPage } from "@/pages/ResumesPage";
import { ResumeAnalysisPage } from "@/pages/ResumeAnalysisPage";
import { JobMatchingPage } from "@/pages/JobMatchingPage";
import { InterviewPrepPage } from "@/pages/InterviewPrepPage";
import { InterviewSessionPage } from "@/pages/InterviewSessionPage";
import { AnalysisHistoryPage } from "@/pages/AnalysisHistoryPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
