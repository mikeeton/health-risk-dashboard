import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { HeartPulse } from "lucide-react";

import PasswordField from "../components/PasswordField";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoading(true);

      await login(email, password, mfaCode);
      navigate("/", { replace: true });

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
    <div className="app-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:p-8">
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--panel-shadow)] lg:grid-cols-[.9fr_1.1fr]">
        <section className="hidden flex-col justify-between bg-[#17324d] p-12 text-white lg:flex">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <HeartPulse className="h-6 w-6" />
            </div>
            <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Research prototype</p>
            <p className="mt-4 max-w-sm text-3xl font-semibold leading-tight">
              Health observations, in context.
            </p>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-200">
              Review recorded measurements, alerts and experimental risk estimates in one workspace.
            </p>
          </div>
          <p className="text-xs leading-5 text-slate-300">Experimental predictions are not a diagnosis or a substitute for clinical judgement.</p>
        </section>
        <Card className="w-full rounded-none border-0 bg-transparent p-6 shadow-none hover:translate-y-0 hover:shadow-none sm:p-10 lg:p-12">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Health AI workspace</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Welcome Back</h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Sign in to access your monitoring dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="text-sm font-semibold">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              required
              onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950/80 dark:focus:ring-blue-950"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="text-sm font-semibold">
              Password
            </label>
            <div className="mt-2">
              <PasswordField
                id="login-password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-mfa" className="text-sm font-semibold">
              Authenticator code <span className="font-normal text-slate-500 dark:text-slate-400">(if enabled)</span>
            </label>
            <input
              id="login-mfa"
              name="mfa_code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 tracking-[0.3em] dark:border-slate-700 dark:bg-slate-950/80"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="clinical-button h-12 w-full rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-700/20 hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <Link
            to="/register"
            className="block text-center text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
          >
            Request Doctor, Nurse, or Patient Access
          </Link>

          <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
            Use the account approved by your administrator. New users should
            request access before signing in.
          </div>
        </form>
        </Card>
      </div>
    </div>
  );
}
