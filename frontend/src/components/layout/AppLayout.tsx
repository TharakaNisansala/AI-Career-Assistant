import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NAV_ITEMS } from "@/lib/navigation";
import { Button } from "@/components/ui/Button";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white py-6 lg:flex">
        <div className="mb-6 px-6">
          <p className="text-lg font-bold text-indigo-700">AI Career Assistant</p>
        </div>
        <NavLinks />
        <div className="mt-auto px-3 pt-4">
          <div className="rounded-md border border-slate-200 px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <Button variant="ghost" className="mt-2 w-full justify-start" onClick={logout}>
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <p className="text-base font-bold text-indigo-700">AI Career Assistant</p>
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((open) => !open)}
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {isMobileNavOpen && (
          <div id="mobile-nav" className="border-b border-slate-200 bg-white py-3 lg:hidden">
            <NavLinks onNavigate={() => setIsMobileNavOpen(false)} />
            <div className="mt-3 px-3">
              <div className="rounded-md border border-slate-200 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button variant="ghost" className="mt-2 w-full justify-start" onClick={logout}>
                Log out
              </Button>
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
