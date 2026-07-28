import { useEffect, useState } from "react";
import { Activity, Link2, Unlink } from "lucide-react";

import {
  disconnectWithings,
  getWithingsConnectUrl,
  getWithingsStatus,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

type Props = { patientId: number };
type Status = {
  configured: boolean;
  connected: boolean;
  last_sync_at?: string | null;
};

export default function WithingsIntegration({ patientId }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setStatus(await getWithingsStatus(patientId));
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    void refresh();
  }, [patientId]);

  async function connect(demo: boolean) {
    try {
      setBusy(true);
      const result = await getWithingsConnectUrl(patientId, demo);
      window.location.assign(result.authorization_url);
    } catch {
      setMessage(
        "Withings is not configured yet. Add the five WITHINGS_* deployment settings."
      );
      setBusy(false);
    }
  }

  async function disconnect() {
    try {
      setBusy(true);
      await disconnectWithings(patientId);
      await refresh();
      setMessage("Withings connection removed.");
    } catch {
      setMessage("Could not disconnect Withings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold">Withings live measurements</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {status?.connected
                ? `Connected${
                    status.last_sync_at
                      ? ` · last sync ${new Date(status.last_sync_at).toLocaleString()}`
                      : ""
                  }`
                : "Connect a Withings account or its official demo account"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!status?.connected ? (
            <>
              <button
                disabled={busy}
                onClick={() => connect(false)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <Link2 className="h-4 w-4" /> Connect Withings
              </button>
              <button
                disabled={busy}
                onClick={() => connect(true)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-700"
              >
                Use Withings demo
              </button>
            </>
          ) : (
            (user?.role === "doctor" || user?.role === "patient") && (
              <button
                disabled={busy}
                onClick={disconnect}
                className="flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50 dark:border-red-900 dark:text-red-300"
              >
                <Unlink className="h-4 w-4" /> Disconnect
              </button>
            )
          )}
        </div>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          {message}
        </p>
      )}
      <p className="mt-3 text-xs font-semibold text-slate-500">
        Consumer-device readings may be delayed and are not emergency monitoring.
      </p>
    </section>
  );
}
