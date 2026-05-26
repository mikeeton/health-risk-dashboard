import { Users, ShieldCheck, Database, Bell } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Manage users, audit logs, system activity, and hospital operations.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Users", "Manage platform accounts", Users],
          ["Audit Logs", "Review clinical actions", ShieldCheck],
          ["Database", "PostgreSQL system health", Database],
          ["Notifications", "System-wide alerts", Bell],
        ].map(([title, text, Icon]: any) => (
          <div key={title} className="glass-card rounded-3xl p-6">
            <Icon className="mb-4 h-7 w-7 text-blue-600" />
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}