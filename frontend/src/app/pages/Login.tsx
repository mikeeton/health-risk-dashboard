import { useState } from "react";
import { useNavigate } from "react-router";
import { Activity } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("doctor@example.com");
  const [password, setPassword] = useState("Password123");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      await login(email, password);

      showToast({
        type: "success",
        title: "Login successful",
        message: "Welcome back to the Health AI platform.",
      });

      navigate("/");
    } catch {
      showToast({
        type: "error",
        title: "Login failed",
        message: "Check your email, password, and backend server.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <Card className="w-full max-w-md border-blue-100 p-8 shadow-2xl dark:border-slate-800">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <Activity className="h-7 w-7" />
          </div>

          <h1 className="text-3xl font-bold">Welcome Back</h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Sign in to access the monitoring dashboard
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
            />
          </div>

          <Button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-blue-600 text-white shadow-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="rounded-2xl bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-slate-800 dark:text-slate-400">
            Demo: doctor@example.com / Password123
          </div>
        </div>
      </Card>
    </div>
  );
}