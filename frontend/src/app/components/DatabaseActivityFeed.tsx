import { useEffect, useState } from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { getAuditLogs } from "../services/api";
import { useAuth } from "../context/AuthContext";

type AuditLog = {
  id: number;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  timestamp: string;
};

export default function DatabaseActivityFeed() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    async function loadLogs() {
      try {
        const data = await getAuditLogs();
        setLogs(data.slice(0, 6));
      } catch (error) {
        console.error("Failed to load activity feed:", error);
      }
    }

    loadLogs();

    const interval = setInterval(loadLogs, 8000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-blue-600" />

        <div>
          <h2 className="text-xl font-bold">Live Clinician Activity Feed</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pulled directly from PostgreSQL audit logs
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">
          No recent clinical activity yet.
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex gap-3 rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Activity className="h-4 w-4" />
              </div>

              <div>
                <p className="font-bold">{log.action}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {log.entity} #{log.entity_id ?? "—"} by{" "}
                  {log.user_email ?? "System"}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
