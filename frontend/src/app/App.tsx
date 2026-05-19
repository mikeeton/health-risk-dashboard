import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { HealthDataProvider } from "./context/HealthDataContext";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <HealthDataProvider>
        <RouterProvider router={router} />
      </HealthDataProvider>
    </AuthProvider>
  );
}