import { useState } from "react";
import { Link } from "react-router";
import { Loader2, UserPlus } from "lucide-react";

import { createRegistrationRequest } from "../services/api";

const roles = ["doctor", "nurse", "patient"];

export default function RegisterAccess() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "patient",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submitRequest() {
    try {
      setLoading(true);
      setMessage("");

      await createRegistrationRequest(form);

      setMessage(
        "Registration request submitted. An admin must approve your account before you can log in."
      );

      setForm({
        full_name: "",
        email: "",
        password: "",
        role: "patient",
      });
    } catch {
      setMessage("Could not submit request. Email may already exist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <UserPlus className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold">Request Access</h1>
            <p className="mt-1 text-sm text-slate-300">
              Register as a doctor, nurse, or patient. Admin approval is
              required before login.
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-2xl bg-blue-500/20 px-4 py-3 text-sm font-bold text-blue-100">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <input
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
            placeholder="Full name"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
          />

          <input
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            placeholder="Email address"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
          />

          <input
            value={form.password}
            type="password"
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            placeholder="Password"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
          />

          <select
            value={form.role}
            onChange={(event) =>
              setForm({ ...form, role: event.target.value })
            }
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none focus:border-blue-400"
          >
            {roles.map((role) => (
              <option key={role} value={role} className="text-slate-900">
                {role.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            onClick={submitRequest}
            disabled={
              loading || !form.email || !form.full_name || !form.password
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Request
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already approved?{" "}
          <Link to="/login" className="font-bold text-blue-300">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}