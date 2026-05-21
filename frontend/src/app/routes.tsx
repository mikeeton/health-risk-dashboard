import { createBrowserRouter } from "react-router";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import UploadData from "./pages/UploadData";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import ReviewCases from "./pages/ReviewCases";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";

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
        path: "reports",
        element: (
          <ProtectedRoute allowedRoles={["admin", "doctor"]}>
            <Reports />
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
        path: "login",
        Component: Login,
      },
    ],
  },
]);