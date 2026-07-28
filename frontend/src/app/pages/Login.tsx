import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Activity, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";

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
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoading(true);

      await login(email, password);
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
      <div className="pointer-events-none absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-white/70 shadow-[0_30px_90px_rgba(16,42,44,.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60 lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#0284c7] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/15" />
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full border border-white/10" />
          <div>
            <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-none">
              <HeartPulse className="h-6 w-6" />
            </div>
            <p className="mt-10 text-xs font-bold uppercase tracking-[0.22em] text-blue-100">Clinical intelligence</p>
            <h1 className="mt-4 max-w-md text-4xl font-extrabold leading-tight tracking-[-0.04em]">
              Better signals.<br />Clearer decisions.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-blue-50/80">
              Real-time patient monitoring and AI-assisted insight in one secure clinical workspace.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <ShieldCheck className="mb-3 h-5 w-5 text-blue-200" />
              Secure by design
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <Sparkles className="mb-3 h-5 w-5 text-blue-200" />
              AI-assisted care
            </div>
          </div>
        </section>
        <Card className="w-full rounded-none border-0 bg-transparent p-6 shadow-none hover:translate-y-0 hover:shadow-none sm:p-10 lg:p-12">
        <div className="mb-8 text-center">
          <div className="brand-mark mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-white lg:hidden">
            <Activity className="h-7 w-7" />
          </div>

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
              type="email"
              value={email}
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
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
