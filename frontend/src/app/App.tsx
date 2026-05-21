import { RouterProvider } from "react-router";
import { router } from "./routes";
import { HealthDataProvider } from "./context/HealthDataContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HealthDataProvider>
          <RouterProvider router={router} />
        </HealthDataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}