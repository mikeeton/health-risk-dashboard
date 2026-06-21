import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const UploadData = lazy(() => import("./pages/UploadData"));
const Reports = lazy(() => import("./pages/Reports"));
const Login = lazy(() => import("./pages/Login"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const ReviewCases = lazy(() => import("./pages/ReviewCases"));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminApprovals = lazy(() => import("./pages/AdminApprovals"));
const AdminAssignments = lazy(() => import("./pages/AdminAssignments"));
const Referrals = lazy(() => import("./pages/Referrals"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const NurseDashboard = lazy(() => import("./pages/NurseDashboard"));
const PatientDashboard = lazy(() => import("./pages/PatientDashboard"));
const RegisterAccess = lazy(() => import("./pages/RegisterAccess"));

function PageLoader() {
  return (
    <div className="dashboard-shell">
      <div className="glass-card p-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
        Loading...
      </div>
    </div>
  );
}

function lazyPage(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse", "patient"]}>
            {lazyPage(<Dashboard />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "login",
        element: lazyPage(<Login />),
      },

      {
        path: "register",
        element: lazyPage(<RegisterAccess />),
      },

      {
        path: "admin",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            {lazyPage(<AdminDashboard />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "admin/users",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            {lazyPage(<AdminUsers />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "admin/approvals",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            {lazyPage(<AdminApprovals />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "admin/assignments",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            {lazyPage(<AdminAssignments />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "admin/referrals",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            {lazyPage(<Referrals />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "doctor",
        element: (
          <ProtectedRoute allowedRoles={["doctor"]}>
            {lazyPage(<DoctorDashboard />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "nurse",
        element: (
          <ProtectedRoute allowedRoles={["nurse"]}>
            {lazyPage(<NurseDashboard />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "patient",
        element: (
          <ProtectedRoute allowedRoles={["patient"]}>
            {lazyPage(<PatientDashboard />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "analytics",
        element: (
          <ProtectedRoute allowedRoles={["doctor"]}>
            {lazyPage(<AdvancedAnalytics />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "upload",
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            {lazyPage(<UploadData />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "review-cases",
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            {lazyPage(<ReviewCases />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "referrals",
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            {lazyPage(<Referrals />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "reports",
        element: (
          <ProtectedRoute allowedRoles={["doctor"]}>
            {lazyPage(<Reports />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "audit-logs",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            {lazyPage(<AuditLogs />)}
          </ProtectedRoute>
        ),
      },

      {
        path: "ai-assistant",
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            {lazyPage(<AIAssistantPage />)}
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
