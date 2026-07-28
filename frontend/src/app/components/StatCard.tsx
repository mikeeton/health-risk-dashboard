import { Card } from "./ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  status?: "good" | "warning" | "alert";
}

export default function StatCard({
  title,
  value,
  description,
  status,
}: StatCardProps) {
  const statusColor = {
    good: "text-emerald-700 dark:text-emerald-300",
    warning: "text-amber-700 dark:text-amber-300",
    alert: "text-rose-700 dark:text-rose-300",
  };
  const statusAccent = {
    good: "bg-emerald-500",
    warning: "bg-amber-500",
    alert: "bg-rose-500",
  };

  return (
    <Card className="relative min-h-[168px] overflow-hidden p-6">
      <span className={`absolute left-0 top-7 h-10 w-1 rounded-r-full ${status ? statusAccent[status] : "bg-blue-500"}`} />
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-5 font-[var(--font-display)] text-3xl font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
        {value}
      </p>

      <p
        className={`mt-4 flex items-center gap-2 text-xs font-semibold ${
          status ? statusColor[status] : "text-gray-500 dark:text-slate-400"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${status ? statusAccent[status] : "bg-slate-400"}`} />
        {description}
      </p>
    </Card>
  );
}
