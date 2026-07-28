import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  approveRegistrationRequest,
  getRegistrationRequests,
  rejectRegistrationRequest,
} from "../services/api";

type RegistrationRequest = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  age?: number | null;
  conditions?: string | null;
};

export default function AdminApprovals() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRequests() {
    try {
      setLoading(true);
      setMessage("");
      const data = await getRegistrationRequests();
      setRequests(data);
    } catch {
      setMessage(
        "Failed to load requests. Confirm the backend is running and PostgreSQL is reachable."
      );
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: number) {
    try {
      await approveRegistrationRequest(id);
      setMessage("Request approved. User can now log in.");
      await loadRequests();
    } catch {
      setMessage("Could not approve request.");
    }
  }

  async function reject(id: number) {
    try {
      await rejectRegistrationRequest(id);
      setMessage("Request rejected.");
      await loadRequests();
    } catch {
      setMessage("Could not reject request.");
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const pending = requests.filter((request) => request.status === "pending");
  const reviewedCount = requests.length - pending.length;

  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
                Registration Approvals
              </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
                Review only pending account requests.
              </p>
            </div>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
            {message}
          </div>
        )}
      </section>

      <section className="glass-card overflow-hidden rounded-3xl">
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
            Pending Requests
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {pending.length} pending. {reviewedCount} reviewed.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-4 text-left">Applicant</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-left">Requested Role</th>
                <th className="px-6 py-4 text-left">Clinical Context</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {pending.map((request) => (
                <tr
                  key={request.id}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-6 py-4 font-bold">{request.full_name}</td>
                  <td className="px-6 py-4 text-slate-500">{request.email}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {request.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {request.role === "patient"
                      ? `${request.age ?? "Age not set"} · ${
                          request.conditions ?? "No conditions listed"
                        }`
                      : "Staff account"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => approve(request.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-xs font-bold text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>

                      <button
                        onClick={() => reject(request.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!pending.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No pending registration requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
