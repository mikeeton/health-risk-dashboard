import { RouterProvider } from "react-router";
import { router } from "./routes";
import { HealthDataProvider } from "./context/HealthDataContext";

export default function App() {
  return (
    <HealthDataProvider>
      <RouterProvider router={router} />
    </HealthDataProvider>
  );
}