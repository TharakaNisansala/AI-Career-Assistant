export interface NavItem {
  label: string;
  to: string;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", end: true },
  { label: "Resumes", to: "/resumes" },
  { label: "Job Matching", to: "/job-matching" },
  { label: "Interview Prep", to: "/interview-prep" },
  { label: "Analysis History", to: "/history" },
  { label: "Profile", to: "/profile" },
];
