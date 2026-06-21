import { useState } from "react";
import { Outlet, NavLink } from "react-router";
import {
  Activity,
  BarChart3,
  Bot,
  ClipboardList,
  FileText,
  GitPullRequest,
  HeartHandshake,
  LineChart,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  ShieldCheck,
  UserPlus,
  Stethoscope,
  Upload,
  User,
  UserCog,
  UserRound,
  X,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import ThemeToggle from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";

import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/HealthDataContext";
import { generateAlerts } from "../utils/alertEngine";

export default function Layout() {
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor";
  const isNurse = user?.role === "nurse";
  const isPatient = user?.role === "patient";

  const { healthData, selectedPatient } = useHealthData();

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

  const alerts = generateAlerts(
    healthData.filter((record) => record.patientId === selectedPatient.id),
    selectedPatient
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    // Navigation is role-aware for usability; backend access checks still remain
    // the real security boundary.
    {
      label: "Admin",
      path: "/admin",
      icon: UserCog,
      show: isAdmin,
    },
    {
      label: "User Management",
      path: "/admin/users",
      icon: UserCog,
      show: isAdmin,
    },
    {
      label: "Approvals",
      path: "/admin/approvals",
      icon: ShieldCheck,
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
      show: isDoctor || isNurse,
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"
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
                <h1 className="text-xl font-bold tracking-tight">Health AI</h1>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monitoring Platform
                </p>
              </div>

              {!mobile && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}

              {mobile && (
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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
                title={item.label}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                    sidebarOpen || mobile
                      ? "gap-3 px-4 py-3"
                      : "justify-center px-0 py-3"
                  } ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <motion.aside
        animate={{
          width: sidebarOpen ? 260 : 88,
        }}
        transition={{
          duration: 0.24,
        }}
        className="fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-slate-200 bg-white px-5 py-6 dark:border-slate-800 dark:bg-slate-950 lg:flex"
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
              className="h-full w-[285px] border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950"
            >
              <SidebarContent mobile />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          marginLeft: sidebarOpen ? 260 : 88,
        }}
        transition={{
          duration: 0.24,
        }}
        className="min-h-screen lg:block"
      >
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 lg:hidden"
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

            <div className="flex items-center gap-3">
              <NotificationDropdown alerts={alerts} />

              <ThemeToggle />

              {user ? (
                <motion.div
                  whileHover={{ y: -1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
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
                    className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
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

        <main className="px-4 pb-8 sm:px-8">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}
