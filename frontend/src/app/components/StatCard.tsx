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
    <Card className="relative min-h-[132px] overflow-hidden p-5">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${status ? statusAccent[status] : "bg-blue-500"}`} />
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-3 font-[var(--font-display)] text-[1.7rem] font-bold tracking-[-0.035em] text-slate-950 dark:text-white">
        {value}
      </p>

      <p
        className={`mt-2.5 flex items-center gap-1.5 text-[11px] font-medium ${
          status ? statusColor[status] : "text-gray-500 dark:text-slate-400"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${status ? statusAccent[status] : "bg-slate-400"}`} />
        {description}
      </p>
    </Card>
  );
}
