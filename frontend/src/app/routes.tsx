import { createBrowserRouter } from "react-router";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import UploadData from "./pages/UploadData";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import ReviewCases from "./pages/ReviewCases";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import AuditLogs from "./pages/AuditLogs";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import NurseDashboard from "./pages/NurseDashboard";
import PatientDashboard from "./pages/PatientDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <Dashboard />
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
          <ProtectedRoute allowedRoles={["admin", "doctor"]}>
            <UploadData />
          </ProtectedRoute>
        ),
      },
      {
        path: "review-cases",
        element: (
          <ProtectedRoute allowedRoles={["admin", "doctor"]}>
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
          <ProtectedRoute allowedRoles={["admin", "doctor"]}>
            <AuditLogs />
          </ProtectedRoute>
        ),
      },
      {
        path: "login",
        Component: Login,
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
  path: "doctor",
  element: (
    <ProtectedRoute allowedRoles={["doctor", "admin"]}>
      <DoctorDashboard />
    </ProtectedRoute>
  ),
},
{
  path: "nurse",
  element: (
    <ProtectedRoute allowedRoles={["nurse", "admin"]}>
      <NurseDashboard />
    </ProtectedRoute>
  ),
},
{
  path: "patient",
  element: (
    <ProtectedRoute allowedRoles={["patient", "admin"]}>
      <PatientDashboard />
    </ProtectedRoute>
  ),
},
    ],
  },
]);