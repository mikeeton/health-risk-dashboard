import {
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import { Card } from "./ui/card";

import type { HealthTrend } from "../utils/trendAnalysis";

type TrendAnalysisPanelProps = {
  trends: HealthTrend[];
};

export default function TrendAnalysisPanel({
  trends,
}: TrendAnalysisPanelProps) {
  const getTrendStyles = (
    direction: HealthTrend["direction"],
    severity: HealthTrend["severity"]
  ) => {
    if (direction === "worsening") {
      return {
        icon: TrendingDown,

        border:
          severity === "high"
            ? "border-red-500 bg-red-50 dark:bg-red-950/30"
            : "border-orange-500 bg-orange-50 dark:bg-orange-950/30",

        text:
          severity === "high"
            ? "text-red-700 dark:text-red-400"
            : "text-orange-700 dark:text-orange-400",
      };
    }

    if (direction === "improving") {
      return {
        icon: TrendingUp,

        border:
          "border-green-500 bg-green-50 dark:bg-green-950/30",

        text:
          "text-green-700 dark:text-green-400",
      };
    }

    return {
      icon: Minus,

      border:
        "border-blue-500 bg-blue-50 dark:bg-blue-950/30",

      text:
        "text-blue-700 dark:text-blue-400",
    };
  };

  return (
    <div className="space-y-4">
      {trends.length === 0 ? (
        <Card className="p-6">
          <p className="text-gray-600 dark:text-slate-400">
            No major health trends detected.
          </p>
        </Card>
      ) : (
        trends.map((trend, index) => {
          const styles =
            getTrendStyles(
              trend.direction,
              trend.severity
            );

          const Icon = styles.icon;

          return (
            <Card
              key={index}
              className={`border-l-4 p-5 ${styles.border}`}
            >
              <div className="flex items-start gap-4">
                <Icon
                  className={`mt-1 h-6 w-6 ${styles.text}`}
                />

                <div className="flex-1">
                  <div
                    className={`text-lg font-semibold ${styles.text}`}
                  >
                    {trend.metric} Trend
                  </div>

                  <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">
                    {trend.message}
                  </p>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}