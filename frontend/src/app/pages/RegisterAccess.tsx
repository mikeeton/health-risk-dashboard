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
    age: "",
    gender: "",
    conditions: "",
    medication_notes: "",
    lifestyle_notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isPatient = form.role === "patient";

  async function submitRequest() {
    try {
      setLoading(true);
      setMessage("");

      await createRegistrationRequest({
        email: form.email,
        full_name: form.full_name,
        password: form.password,
        role: form.role,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        conditions: form.conditions || null,
        medication_notes: form.medication_notes || null,
        lifestyle_notes: form.lifestyle_notes || null,
      });

      setMessage(
        "Registration request submitted. An admin must approve your account before you can log in."
      );

      setForm({
        full_name: "",
        email: "",
        password: "",
        role: "patient",
        age: "",
        gender: "",
        conditions: "",
        medication_notes: "",
        lifestyle_notes: "",
      });
    } catch {
      setMessage("Could not submit request. Check the details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <UserPlus className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Request Access</h1>
            <p className="mt-1 text-sm text-slate-300">
              Register as a doctor, nurse, or patient. Patient condition details
              are used by the live simulator after admin approval.
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

          {isPatient && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="mb-4 text-lg font-extrabold">
                Patient Health Profile
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.age}
                  type="number"
                  onChange={(event) =>
                    setForm({ ...form, age: event.target.value })
                  }
                  placeholder="Age"
                  className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
                />

                <select
                  value={form.gender}
                  onChange={(event) =>
                    setForm({ ...form, gender: event.target.value })
                  }
                  className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none focus:border-blue-400"
                >
                  <option value="" className="text-slate-900">
                    Select gender
                  </option>
                  <option value="male" className="text-slate-900">
                    Male
                  </option>
                  <option value="female" className="text-slate-900">
                    Female
                  </option>
                  <option value="other" className="text-slate-900">
                    Other
                  </option>
                </select>
              </div>

              <textarea
                value={form.conditions}
                onChange={(event) =>
                  setForm({ ...form, conditions: event.target.value })
                }
                placeholder="Known conditions / ailments e.g. hypertension, sleep apnea, COPD, kidney disease"
                className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
              />

              <textarea
                value={form.medication_notes}
                onChange={(event) =>
                  setForm({ ...form, medication_notes: event.target.value })
                }
                placeholder="Medication notes e.g. takes inhaler, blood pressure tablets, insulin"
                className="mt-4 min-h-24 w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
              />

              <textarea
                value={form.lifestyle_notes}
                onChange={(event) =>
                  setForm({ ...form, lifestyle_notes: event.target.value })
                }
                placeholder="Lifestyle notes e.g. poor sleep, low activity, smoker, high stress"
                className="mt-4 min-h-24 w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
              />
            </div>
          )}

          <button
            onClick={submitRequest}
            disabled={
              loading ||
              !form.email ||
              !form.full_name ||
              !form.password ||
              (isPatient && (!form.age || !form.conditions))
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
