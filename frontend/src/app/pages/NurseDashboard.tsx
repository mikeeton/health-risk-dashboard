import { Link } from "react-router";
import { Bell, ClipboardCheck, HeartPulse, Pill } from "lucide-react";

const cards = [
  {
    title: "Medication",
    subtitle: "Track taken/missed doses",
    path: "/#medication-adherence",
    icon: Pill,
  },
  {
    title: "Vitals",
    subtitle: "Monitor patient observations",
    path: "/#vitals",
    icon: HeartPulse,
  },
  {
    title: "Alerts",
    subtitle: "Respond to notifications",
    path: "/review-cases",
    icon: Bell,
  },
  {
    title: "Tasks",
    subtitle: "Clinical task checklist",
    path: "/ai-assistant",
    icon: ClipboardCheck,
  },
];

export default function NurseDashboard() {
  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">Nurse Dashboard</h1>
        <p className="mt-2 text-slate-500">
          Track medication adherence, vital observations, alerts, and patient notes.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              to={card.path}
              className="glass-card rounded-3xl p-6 transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
            >
              <Icon className="mb-5 h-8 w-8 text-blue-500" />
              <h2 className="text-xl font-extrabold">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{card.subtitle}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}