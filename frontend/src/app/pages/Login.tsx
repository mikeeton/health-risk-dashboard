import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { Activity } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoading(true);

      await login(email, password);

      showToast({
        type: "success",
        title: "Login successful",
        message: "Welcome back to the Health AI platform.",
      });
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
    <div className="flex min-h-[80vh] items-center justify-center bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:p-6">
      <Card className="w-full max-w-md border-slate-200 p-5 shadow-sm dark:border-slate-800 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Activity className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold sm:text-3xl">Welcome Back</h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Sign in to access the monitoring dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="text-sm font-semibold">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="text-sm font-semibold">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-950"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <Link
            to="/register"
            className="block text-center text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Request Doctor, Nurse, or Patient Access
          </Link>

          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-400">
            Use the account approved by your administrator. New users should
            request access before signing in.
          </div>
        </form>
      </Card>
    </div>
  );
}
