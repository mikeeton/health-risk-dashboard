import { Pill, Activity, Bell, ClipboardCheck } from "lucide-react";

export default function NurseDashboard() {
  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">Nurse Dashboard</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Track medication adherence, vital observations, alerts, and patient notes.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Medication", "Track taken/missed doses", Pill],
          ["Vitals", "Monitor patient observations", Activity],
          ["Alerts", "Respond to notifications", Bell],
          ["Tasks", "Clinical task checklist", ClipboardCheck],
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