import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Activity, ArrowRight, ClipboardCheck, GitPullRequest, Shield, UserPlus, Users } from "lucide-react";

import { getAdminOperations } from "../services/api";

type Operations = {
  services?: Record<string, string | boolean>;
  governance?: Record<string, string | boolean>;
  counts?: Record<string, number>;
  backup?: { status?: string; latest_verified_at?: string | null };
};

const destinations = [
  { label: "User management", detail: "Accounts and status", href: "/admin/users", icon: Users },
  { label: "Access approvals", detail: "Review new requests", href: "/admin/approvals", icon: ClipboardCheck },
  { label: "Assignments", detail: "Care-team access", href: "/admin/assignments", icon: UserPlus },
  { label: "Referrals", detail: "Review routing", href: "/admin/referrals", icon: GitPullRequest },
  { label: "Audit trail", detail: "Recorded system activity", href: "/audit-logs", icon: Shield },
];

export default function AdminDashboard() {
  const [operations, setOperations] = useState<Operations | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getAdminOperations().then((result) => setOperations(result as Operations)).catch(() => setError("Operations status is unavailable."));
  }, []);

  return (
    <div className="dashboard-shell space-y-6">
      <header className="border-b border-[var(--panel-border)] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">Operations console</p>
        <h1 className="mt-2 text-3xl font-semibold">Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted-text)]">Manage access, review operational health and follow recorded activity. Clinical records remain outside this role.</p>
      </header>
      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]">
        <section className="glass-card overflow-hidden" aria-labelledby="admin-operations">
          <div className="border-b border-[var(--panel-border)] p-5"><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-indigo-700 dark:text-indigo-300" /><h2 id="admin-operations" className="text-lg font-semibold">Service and governance status</h2></div><p className="mt-2 text-xs text-[var(--muted-text)]">Current values returned by the operations API; configuration is not an uptime guarantee.</p></div>
          {!operations ? <p className="p-5 text-sm text-[var(--muted-text)]">{error ? "No current status available." : "Loading operations status…"}</p> : (
            <div className="grid gap-6 p-5 sm:grid-cols-2">
              <div><h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted-text)]">Services</h3><dl className="mt-2 divide-y divide-[var(--panel-border)]">{Object.entries(operations.services ?? {}).map(([name, status]) => <div key={name} className="flex justify-between gap-3 py-3 text-sm"><dt className="capitalize">{name.replaceAll("_", " ")}</dt><dd className="font-medium">{String(status).replaceAll("_", " ")}</dd></div>)}</dl></div>
              <div><h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted-text)]">Governance</h3><dl className="mt-2 divide-y divide-[var(--panel-border)]">{Object.entries(operations.governance ?? {}).map(([name, status]) => <div key={name} className="flex justify-between gap-3 py-3 text-sm"><dt className="capitalize">{name.replaceAll("_", " ")}</dt><dd className="font-medium">{typeof status === "boolean" ? status ? "Recorded" : "Not recorded" : String(status).replaceAll("_", " ")}</dd></div>)}</dl></div>
            </div>
          )}
        </section>
        <aside className="glass-card p-5" aria-labelledby="admin-queue"><h2 id="admin-queue" className="text-lg font-semibold">Operational queue</h2><p className="mt-1 text-xs text-[var(--muted-text)]">Counts from the current operations snapshot.</p><dl className="mt-5 divide-y divide-[var(--panel-border)]">{[
          ["Active users", "active_users"],
          ["Open incidents", "open_incidents"],
          ["Open data requests", "open_data_requests"],
          ["AI feedback entries", "ai_feedback"],
        ].map(([label, key]) => <div key={key} className="flex items-center justify-between py-4"><dt className="text-sm">{label}</dt><dd className="text-xl font-semibold tabular-nums">{operations?.counts?.[key] ?? "—"}</dd></div>)}</dl><p className="mt-5 rounded-lg bg-[var(--surface-subtle)] p-3 text-xs text-[var(--muted-text)]">Backup verification: {operations?.backup?.status?.replaceAll("_", " ") ?? "Status unavailable"}</p></aside>
      </div>
      <section className="glass-card p-5" aria-labelledby="admin-actions"><h2 id="admin-actions" className="text-lg font-semibold">Management areas</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{destinations.map(({ label, detail, href, icon: Icon }) => <Link key={href} to={href} className="flex items-start gap-3 rounded-xl border border-[var(--panel-border)] p-4 hover:bg-[var(--surface-hover)]"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700 dark:text-indigo-300" /><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-[var(--muted-text)]">{detail}</span></span><ArrowRight className="h-4 w-4 text-[var(--muted-text)]" /></Link>)}</div></section>
    </div>
  );
}
