import { Card } from "./ui/card";

interface HealthScoreGaugeProps {
  score: number;
  max?: number;
}

export default function HealthScoreGauge({
  score,
  max = 100,
}: HealthScoreGaugeProps) {
  const percentage = (score / max) * 100;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference;

  const status =
    score >= 80
      ? { text: "Low Risk", color: "text-green-600 dark:text-green-400", stroke: "#10b981" }
      : score >= 50
      ? { text: "Medium Risk", color: "text-yellow-600 dark:text-yellow-400", stroke: "#f59e0b" }
      : { text: "High Risk", color: "text-red-600 dark:text-red-400", stroke: "#ef4444" };

  return (
    <Card className="chart-card flex flex-col items-center justify-center p-8">
      <h3 className="mb-6 text-lg font-semibold text-gray-950 dark:text-white">
        Health Score
      </h3>

      <div className="relative h-56 w-56">
        <svg className="h-full w-full -rotate-90">
          <circle
            cx="112"
            cy="112"
            r="90"
            stroke="#e5e7eb"
            strokeWidth="16"
            fill="none"
          />

          <circle
            cx="112"
            cy="112"
            r="90"
            stroke={status.stroke}
            strokeWidth="16"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-gray-950 dark:text-white">
            {score}
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400">
            / {max}
          </div>
        </div>
      </div>

      <div className={`mt-6 text-lg font-bold ${status.color}`}>
        Status: {status.text}
      </div>
    </Card>
  );
}