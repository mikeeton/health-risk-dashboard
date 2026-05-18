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
    good: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    alert: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className="min-h-[150px] p-6">
      <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-4 text-3xl font-bold text-gray-950 dark:text-white">
        {value}
      </p>

      <p
        className={`mt-4 text-xs font-medium ${
          status ? statusColor[status] : "text-gray-500 dark:text-slate-400"
        }`}
      >
        {description}
      </p>
    </Card>
  );
}