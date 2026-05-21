import { ClipboardCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

type Props = {
  alertsCount: number;
  queueCount: number;
};

export default function ClinicianActivityFeed({ alertsCount, queueCount }: Props) {
  const activities = [
    {
      icon: AlertTriangle,
      title: `${alertsCount} active alert${alertsCount === 1 ? "" : "s"}`,
      text: "System is monitoring patient risk notifications.",
    },
    {
      icon: ClipboardCheck,
      title: `${queueCount} clinician case${queueCount === 1 ? "" : "s"}`,
      text: "Patients currently flagged for clinical review.",
    },
    {
      icon: CheckCircle2,
      title: "AI engine active",
      text: "Baseline learning and risk scoring are running.",
    },
  ];

  return (
    <section className="glass-card fade-up rounded-3xl p-6">
      <h2 className="text-xl font-bold">Clinician Activity Feed</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Live workflow summary
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {activities.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70"
            >
              <Icon className="mb-3 h-5 w-5 text-blue-600" />
              <p className="font-bold">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}