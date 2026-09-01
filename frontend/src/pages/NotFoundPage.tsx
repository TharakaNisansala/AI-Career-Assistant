import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center">
      <p className="text-6xl font-bold text-indigo-600">404</p>
      <p className="text-slate-600">The page you're looking for doesn't exist.</p>
      <Link to="/">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
