import { Outlet, Link, useLocation } from "react-router";
import { Activity, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    return path !== "/" && location.pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    isActive(path)
      ? "text-blue-600 dark:text-blue-400 font-semibold"
      : "text-gray-700 dark:text-slate-300 font-semibold hover:text-blue-600 dark:hover:text-blue-400";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold">Health Risk Dashboard</span>
          </div>

          <nav className="flex items-center gap-8 rounded-xl bg-gray-100 px-6 py-3 dark:bg-slate-800">
            <Link to="/" className={linkClass("/")}>
              Dashboard
            </Link>
            <Link to="/upload" className={linkClass("/upload")}>
              Upload Data
            </Link>
            <Link to="/reports" className={linkClass("/reports")}>
              Reports
            </Link>
            <Link to="/login" className={linkClass("/login")}>
              Login
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}