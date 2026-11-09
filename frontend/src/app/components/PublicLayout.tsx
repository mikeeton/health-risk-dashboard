import { Activity } from "lucide-react";
import { Outlet, useLocation } from "react-router";

import ThemeToggle from "./ThemeToggle";

export default function PublicLayout() {
  const { pathname } = useLocation();
  const darkPage = pathname === "/register";
  return (
    <div className="min-h-screen">
      <a href="#public-content" className="skip-link">Skip to main content</a>
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className={`flex items-center gap-3 text-sm font-semibold ${darkPage ? "text-white" : "text-[var(--page-text)]"}`}>
          <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl" aria-hidden="true">
            <Activity className="h-5 w-5" />
          </span>
          <span>Health Risk Dashboard</span>
        </div>
        <ThemeToggle />
      </header>
      <main id="public-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
