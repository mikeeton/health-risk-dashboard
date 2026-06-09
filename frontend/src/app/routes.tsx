import { createBrowserRouter } from "react-router";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import UploadData from "./pages/UploadData";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import AIAssistantPage from "./pages/AIAssistantPage";
import ReviewCases from "./pages/ReviewCases";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import AuditLogs from "./pages/AuditLogs";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminApprovals from "./pages/AdminApprovals";

import DoctorDashboard from "./pages/DoctorDashboard";
import NurseDashboard from "./pages/NurseDashboard";
import PatientDashboard from "./pages/PatientDashboard";

import RegisterAccess from "./pages/RegisterAccess";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse", "patient"]}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },

      {
        path: "login",
        Component: Login,
      },

      {
        path: "register",
        element: <RegisterAccess />,
      },

      {
        path: "admin",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },

      {
        path: "admin/users",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUsers />
          </ProtectedRoute>
        ),
      },

      {
        path: "admin/approvals",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminApprovals />
          </ProtectedRoute>
        ),
      },

      {
        path: "doctor",
        element: (
          <ProtectedRoute allowedRoles={["doctor"]}>
            <DoctorDashboard />
          </ProtectedRoute>
        ),
      },

      {
        path: "nurse",
        element: (
          <ProtectedRoute allowedRoles={["nurse"]}>
            <NurseDashboard />
          </ProtectedRoute>
        ),
      },

      {
        path: "patient",
        element: (
          <ProtectedRoute allowedRoles={["patient"]}>
            <PatientDashboard />
          </ProtectedRoute>
        ),
      },

      {
        path: "analytics",
        element: (
          <ProtectedRoute allowedRoles={["admin", "doctor"]}>
            <AdvancedAnalytics />
          </ProtectedRoute>
        ),
      },

      {
        path: "upload",
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            <UploadData />
          </ProtectedRoute>
        ),
      },

      {
        path: "review-cases",
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            <ReviewCases />
          </ProtectedRoute>
        ),
      },

      {
        path: "reports",
        element: (
          <ProtectedRoute allowedRoles={["admin", "doctor"]}>
            <Reports />
          </ProtectedRoute>
        ),
      },

      {
        path: "audit-logs",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <AuditLogs />
          </ProtectedRoute>
        ),
      },

      {
        path: "ai-assistant",
        element: (
          <ProtectedRoute allowedRoles={["doctor", "nurse"]}>
            <AIAssistantPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);