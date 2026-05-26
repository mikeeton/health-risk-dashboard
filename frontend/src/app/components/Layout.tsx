import { useState } from "react";
import { Outlet, NavLink } from "react-router";
import {
  Stethoscope,
  UserCog,
  UserRound,
  HeartHandshake,
} from "lucide-react";

import {
  Activity,
  BarChart3,
  Upload,
  FileText,
  ClipboardList,
  LogOut,
  User,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  LineChart,
  Shield,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import ThemeToggle from "./ThemeToggle";
import NotificationDropdown from "./NotificationDropdown";

import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/HealthDataContext";
import { generateAlerts } from "../utils/alertEngine";

export default function Layout() {
  const { user, logout, isDoctor, isAdmin } = useAuth();

  const { healthData, selectedPatient } = useHealthData();

  const alerts = generateAlerts(
    healthData.filter((record) => record.patientId === selectedPatient.id),
    selectedPatient
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", path: "/", icon: BarChart3, show: true },
    {
      label: "Analytics",
      path: "/analytics",
      icon: LineChart,
      show: isDoctor || isAdmin,
    },
    {
      label: "Upload Data",
      path: "/upload",
      icon: Upload,
      show: isDoctor || isAdmin,
    },
    {
      label: "Review Cases",
      path: "/review-cases",
      icon: ClipboardList,
      show: isDoctor || isAdmin,
    },
    {
  label: "Admin",
  path: "/admin",
  icon: UserCog,
  show: isAdmin,
},
{
  label: "Doctor",
  path: "/doctor",
  icon: Stethoscope,
  show: isDoctor || isAdmin,
},
{
  label: "Nurse",
  path: "/nurse",
  icon: HeartHandshake,
  show: isAdmin,
},
{
  label: "Patient",
  path: "/patient",
  icon: UserRound,
  show: true,
},
    {
      label: "Reports",
      path: "/reports",
      icon: FileText,
      show: isDoctor || isAdmin,
    },
    {
      label: "Audit Logs",
      path: "/audit-logs",
      icon: Shield,
      show: isDoctor || isAdmin,
    },
  ];

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="mb-8 flex items-center justify-between gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={() =>
            mobile
              ? setMobileOpen(false)
              : setSidebarOpen((value) => !value)
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
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

      <nav className="flex-1 space-y-2 overflow-hidden">
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
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  }`
                }
              >
                <motion.div whileHover={{ scale: 1.08 }}>
                  <Icon className="h-5 w-5 shrink-0" />
                </motion.div>

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

      <motion.div
        whileHover={{ y: -2 }}
        className={`rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/20 transition-all ${
          sidebarOpen || mobile
            ? "p-4"
            : "flex items-center justify-center p-3"
        }`}
      >
        {sidebarOpen || mobile ? (
          <>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <h3 className="text-sm font-bold">AI Monitoring Active</h3>

            <p className="mt-2 text-xs leading-relaxed text-blue-50">
              Baseline learning, predictive scoring, medication adherence,
              clinician escalation, audit logging, and real-time monitoring are
              active.
            </p>
          </>
        ) : (
          <ShieldCheck className="h-5 w-5" />
        )}
      </motion.div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 text-slate-900 dark:from-[#020617] dark:via-[#020617] dark:to-[#0f172a] dark:text-white">
      <motion.aside
        animate={{
          width: sidebarOpen ? 260 : 88,
        }}
        transition={{
          duration: 0.24,
        }}
        className="glass-card fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-white/10 px-5 py-6 lg:flex"
      >
        <SidebarContent />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm lg:hidden"
          >
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.25 }}
              className="glass-card h-full w-[285px] p-5"
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
        <header className="sticky top-0 z-40 px-4 py-4 sm:px-7">
          <div className="flex items-center justify-between lg:justify-end">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/75 shadow-md backdrop-blur transition hover:scale-105 dark:bg-slate-900/80 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <NotificationDropdown alerts={alerts} />

              <ThemeToggle />

              {user ? (
                <motion.div
                  whileHover={{ y: -1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
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
                    className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:scale-[1.02] hover:bg-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </motion.div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
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