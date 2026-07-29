import { Link } from "react-router";
import { CalendarClock, FileText, HeartPulse, Pill } from "lucide-react";

const cards = [
  {
    title: "My Vitals",
    subtitle: "Latest health readings",
    path: "/#vitals",
    icon: HeartPulse,
  },
  {
    title: "My Medication",
    subtitle: "Dose adherence status",
    path: "/#medication-adherence",
    icon: Pill,
  },
  {
    title: "My Reports",
    subtitle: "Clinician PDF summaries",
    path: "/care?tab=documents",
    icon: FileText,
  },
  {
    title: "Timeline",
    subtitle: "Care events and notes",
    path: "/#patient-timeline",
    icon: CalendarClock,
  },
];

export default function PatientDashboard() {
  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">Patient Dashboard</h1>
        <p className="mt-2 text-slate-500">
          View personal vitals, medications, reports, and care timeline.
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
