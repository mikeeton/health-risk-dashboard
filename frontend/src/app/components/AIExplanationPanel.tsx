import {
  Brain,
  AlertTriangle,
  Activity,
  HeartPulse,
} from "lucide-react";

import { Card } from "./ui/card";

type AIExplanationPanelProps = {
  reasons: string[];
  riskLevel: string;
};

export default function AIExplanationPanel({
  reasons,
  riskLevel,
}: AIExplanationPanelProps) {
  const getRiskStyles = () => {
    switch (riskLevel) {
      case "Critical":
        return {
          border:
            "border-red-500 bg-red-50 dark:bg-red-950/30",
          text: "text-red-700 dark:text-red-400",
          icon: AlertTriangle,
        };

      case "High":
        return {
          border:
            "border-orange-500 bg-orange-50 dark:bg-orange-950/30",
          text:
            "text-orange-700 dark:text-orange-400",
          icon: Activity,
        };

      case "Moderate":
        return {
          border:
            "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
          text:
            "text-yellow-700 dark:text-yellow-400",
          icon: HeartPulse,
        };

      default:
        return {
          border:
            "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
          text: "text-blue-700 dark:text-blue-400",
          icon: Brain,
        };
    }
  };

  const styles = getRiskStyles();

  const Icon = styles.icon;

  return (
    <Card
      className={`border-l-4 p-6 ${styles.border}`}
    >
      <div className="mb-5 flex items-center gap-3">
        <Icon className={`h-7 w-7 ${styles.text}`} />

        <div>
          <h2
            className={`text-xl font-bold ${styles.text}`}
          >
            Calculated Risk Indicator
          </h2>

          <p className="text-sm text-gray-600 dark:text-slate-400">
            Deterministic thresholds compared with the patient baseline — not ML or Groq
          </p>
        </div>
      </div>

      {reasons.length === 0 ? (
        <p className="text-gray-700 dark:text-slate-300">
          No major physiological anomalies detected.
        </p>
      ) : (
        <ul className="space-y-3">
          {reasons.map((reason, index) => (
            <li
              key={index}
              className="flex items-start gap-3"
            >
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${styles.text.replace(
                  "text",
                  "bg"
                )}`}
              />

              <span className="text-gray-800 dark:text-slate-200">
                {reason}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
