import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShieldCheck,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getAuditLogs } from "../services/api";

type AuditLog = {
  id: number;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  timestamp: string;
};

const PAGE_SIZE = 8;

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await getAuditLogs();
        setLogs(data);
      } catch (error) {
        console.error("Failed to load audit logs:", error);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  const actions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action))).sort();
  }, [logs]);

  const users = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.user_email).filter(Boolean))
    ).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        const matchesSearch =
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          log.entity.toLowerCase().includes(search.toLowerCase()) ||
          String(log.entity_id ?? "").includes(search.toLowerCase()) ||
          String(log.user_email ?? "").toLowerCase().includes(search.toLowerCase());

        const matchesAction =
          actionFilter === "all" || log.action === actionFilter;

        const matchesUser =
          userFilter === "all" || log.user_email === userFilter;

        return matchesSearch && matchesAction && matchesUser;
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [logs, search, actionFilter, userFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  const paginatedLogs = filteredLogs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const exportCSV = () => {
    const headers = ["ID", "User", "Action", "Entity", "Entity ID", "Timestamp"];

    const rows = filteredLogs.map((log) => [
      log.id,
      log.user_email ?? "System",
      log.action,
      log.entity,
      log.entity_id ?? "",
      log.timestamp,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value)}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-logs.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="dashboard-shell">
        <div className="glass-card rounded-3xl p-8">
          Loading audit logs...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold">Audit Logs</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Track system actions, user activity, patient changes, vitals,
                and review case updates.
              </p>
            </div>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.02] hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5">
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by action, user, entity, or ID..."
              className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-11 pr-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
          >
            <option value="all">All Actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            value={userFilter}
            onChange={(event) => {
              setUserFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
          >
            <option value="all">All Users</option>
            {users.map((user) => (
              <option key={user as string} value={user as string}>
                {user}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="glass-card overflow-hidden rounded-3xl">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Showing {paginatedLogs.length} of {filteredLogs.length} logs
          </p>
        </div>

        {paginatedLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No audit logs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Entity ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-slate-100 transition hover:bg-blue-50/50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {log.user_email ?? "System"}
                    </td>

                    <td className="px-6 py-4">{log.entity}</td>

                    <td className="px-6 py-4 text-slate-500">
                      {log.entity_id ?? "—"}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}