import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router";
import {
  Activity,
  BarChart3,
  BellRing,
  Bot,
  ClipboardList,
  FileText,
  GitPullRequest,
  HeartHandshake,
  LineChart,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ClipboardCheck,
  UserPlus,
  Stethoscope,
  Upload,
  User,
  Users,
  UserRound,
  X,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import ThemeToggle from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";

import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/HealthDataContext";

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor";
  const isNurse = user?.role === "nurse";
  const isPatient = user?.role === "patient";

  const { selectedPatient } = useHealthData();

  const roleLabel = user?.role
    ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)} Workspace`
    : "Health AI";

  const roleSubtitle = isAdmin
    ? "Users, approvals, assignments, and audit visibility"
    : isDoctor
      ? `Clinical overview for assigned patients${
          selectedPatient?.name ? ` · ${selectedPatient.name}` : ""
        }`
      : isNurse
        ? `Nursing workflow for assigned patients${
            selectedPatient?.name ? ` · ${selectedPatient.name}` : ""
          }`
        : isPatient
          ? "Personal health record and care timeline"
          : "Secure health monitoring platform";

  const roleBadgeClass = isAdmin
    ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
    : isDoctor
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
      : isNurse
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktopShell, setIsDesktopShell] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 1024px)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");

    const updateShellMode = () => {
      setIsDesktopShell(query.matches);
      if (query.matches) setMobileOpen(false);
    };

    updateShellMode();
    query.addEventListener("change", updateShellMode);

    return () => query.removeEventListener("change", updateShellMode);
  }, []);

  const navItems = [
    // Navigation is role-aware for usability; backend access checks still remain
    // the real security boundary.
    {
      label: "Admin",
      path: "/admin",
      icon: LayoutDashboard,
      show: isAdmin,
    },
    {
      label: "User Management",
      path: "/admin/users",
      icon: Users,
      show: isAdmin,
    },
    {
      label: "Approvals",
      path: "/admin/approvals",
      icon: ClipboardCheck,
      show: isAdmin,
    },
    {
      label: "Assignments",
      path: "/admin/assignments",
      icon: UserPlus,
      show: isAdmin,
    },
    {
      label: "Referral Review",
      path: "/admin/referrals",
      icon: GitPullRequest,
      show: isAdmin,
    },
    {
      label: "Audit Logs",
      path: "/audit-logs",
      icon: Shield,
      show: isAdmin,
    },
    {
      label: "Operations",
      path: "/admin/operations",
      icon: Activity,
      show: isAdmin,
    },
    {
      label: "Analytics",
      path: "/analytics",
      icon: LineChart,
      show: isDoctor,
    },
    {
      label: "Reports",
      path: "/reports",
      icon: FileText,
      show: isDoctor,
    },

    {
      label: "Dashboard",
      path: "/",
      icon: BarChart3,
      show: isDoctor || isNurse || isPatient,
    },
    {
      label: "Upload Data",
      path: "/upload",
      icon: Upload,
      show: isDoctor || isNurse,
    },
    {
      label: isPatient ? "My Care" : "Care Workspace",
      path: "/care",
      icon: HeartHandshake,
      show: isDoctor || isNurse || isPatient,
    },
    {
      label: "Review Cases",
      path: "/review-cases",
      icon: ClipboardList,
      show: isDoctor || isNurse,
    },
    {
      label: "Referrals",
      path: "/referrals",
      icon: GitPullRequest,
      show: isDoctor || isNurse,
    },
    {
      label: "Doctor",
      path: "/doctor",
      icon: Stethoscope,
      show: isDoctor,
    },
    {
      label: "Nurse",
      path: "/nurse",
      icon: HeartHandshake,
      show: isNurse,
    },
    {
      label: "Patient",
      path: "/patient",
      icon: UserRound,
      show: isPatient,
    },
    {
      label: "AI Assistant",
      path: "/ai-assistant",
      icon: Bot,
      show: isDoctor || isNurse || isPatient,
    },
    {
      label: "Notifications",
      path: "/notifications",
      icon: BellRing,
      show: Boolean(user),
    },
    {
      label: "Profile & Security",
      path: "/account",
      icon: User,
      show: Boolean(user),
    },
  ];

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="mb-8 flex items-center justify-between gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() =>
            mobile ? setMobileOpen(false) : setSidebarOpen((value) => !value)
          }
          className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
        >
          <Activity className="h-5 w-5" />
        </motion.button>

        <AnimatePresence>
          {(sidebarOpen || mobile) && (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="flex flex-1 items-center justify-between"
            >
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">Health AI</h1>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monitoring Platform
                </p>
              </div>

              {!mobile && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="app-icon-button h-9 w-9 border-0 bg-transparent text-slate-500 shadow-none dark:text-slate-400"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}

              {mobile && (
                <button
                  onClick={() => setMobileOpen(false)}
                  className="app-icon-button h-9 w-9 border-0 bg-transparent text-slate-500 shadow-none dark:text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!sidebarOpen && !mobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="app-icon-button h-9 w-9 border-0 bg-transparent text-slate-500 shadow-none dark:text-slate-400"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-hidden">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin" || item.path === "/"}
                title={item.label}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `nav-item group flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                    sidebarOpen || mobile
                      ? "gap-3 px-4 py-3"
                      : "justify-center px-0 py-3"
                  } ${
                    isActive
                      ? "nav-item-active"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-800 dark:text-slate-300 dark:hover:bg-blue-950/30 dark:hover:text-blue-200"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />

                <AnimatePresence>
                  {(sidebarOpen || mobile) && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
      </nav>

    </>
  );

  return (
    <div className="app-canvas text-slate-900 dark:text-white">
      <motion.aside
        animate={{
          width: sidebarOpen ? 236 : 76,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="premium-sidebar fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-[var(--panel-border)] px-4 py-5 lg:flex"
      >
        <SidebarContent />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 lg:hidden"
          >
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.25 }}
              className="premium-sidebar h-full w-[285px] border-r border-[var(--panel-border)] p-5"
            >
              <SidebarContent mobile />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          marginLeft: isDesktopShell ? (sidebarOpen ? 236 : 76) : 0,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="min-h-screen lg:block"
      >
        <header className="premium-header sticky top-0 z-40 border-b px-4 py-3 sm:px-7">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="app-icon-button shrink-0 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-950 dark:text-white sm:text-base">
                    {roleLabel}
                  </p>

                  {user?.role && (
                    <span
                      className={`hidden rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide sm:inline-flex ${roleBadgeClass}`}
                    >
                      {user.role}
                    </span>
                  )}
                </div>

                <p className="hidden truncate text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
                  {roleSubtitle}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <NotificationDropdown />

              <ThemeToggle />

              {user ? (
                <motion.div
                  whileHover={{ y: -1 }}
                  className="flex items-center gap-3"
                >
                  <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white sm:flex">
                    <User className="h-5 w-5" />
                  </div>

                  <div className="hidden leading-tight sm:block">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {user.full_name}
                    </p>

                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {user.role}
                    </p>
                  </div>

                  <button
                    onClick={logout}
                    className="clinical-button flex h-11 w-11 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 sm:w-auto sm:px-4"
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </motion.div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="pb-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}
