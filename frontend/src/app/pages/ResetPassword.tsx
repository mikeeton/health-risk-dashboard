import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, KeyRound } from "lucide-react";

import PasswordField from "../components/PasswordField";
import { confirmPasswordReset } from "../services/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await confirmPasswordReset(token, password);
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-canvas flex min-h-screen items-center justify-center p-5">
      <section className="glass-card w-full max-w-md rounded-3xl p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><KeyRound className="h-6 w-6" /></div>
        <h1 className="mt-5 text-3xl font-black">Reset password</h1>
        {complete ? (
          <div className="mt-6"><CheckCircle2 className="h-8 w-8 text-emerald-600" /><p className="mt-3 font-bold">Password updated and existing sessions revoked.</p><Link to="/login" className="mt-5 inline-block text-sm font-bold text-blue-700">Continue to sign in</Link></div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {!token && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">This reset link is incomplete.</p>}
            <PasswordField value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New strong password" />
            <PasswordField value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirm new password" />
            <p className="text-xs leading-5 text-slate-500">Use at least 12 characters including uppercase, lowercase, number, and symbol.</p>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading || !token || !password || !confirmation} className="h-12 w-full rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-50">{loading ? "Resetting…" : "Reset password"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
