import { useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useAsync } from "@/hooks/useAsync";
import { formatDate } from "@/lib/format";
import * as resumeService from "@/services/resume.service";
import * as interviewService from "@/services/interview.service";

export function ProfilePage() {
  const { user, logout } = useAuth();

  const fetchResumes = useCallback(() => resumeService.listResumes(), []);
  const { data: resumes } = useAsync(fetchResumes, [], "resumes-list");

  const fetchSessions = useCallback(() => interviewService.listInterviewSessions(), []);
  const { data: sessions } = useAsync(fetchSessions, [], "interview-sessions-list");

  return (
    <div>
      <PageHeader title="Profile" description="Your account details" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader title="Account Information" />
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Full name</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Email</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Member since</dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {user ? formatDate(user.created_at) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Resumes uploaded</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{resumes?.length ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Interview sessions</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{sessions?.length ?? "-"}</dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Session</p>
            <p className="mt-1 text-xs text-slate-500">Sign out of your account on this device.</p>
          </div>
          <Button variant="danger" onClick={logout}>
            Log out
          </Button>
        </Card>
      </div>
    </div>
  );
}
