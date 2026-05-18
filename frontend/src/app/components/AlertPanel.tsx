import {
  AlertTriangle,
  ShieldAlert,
  Activity,
  Info,
} from "lucide-react";

import { Card } from "./ui/card";

import type { HealthAlert } from "../utils/alertEngine";

type AlertPanelProps = {
  alerts: HealthAlert[];
};

export default function AlertPanel({
  alerts,
}: AlertPanelProps) {
  const getAlertStyles = (
    severity: HealthAlert["severity"]
  ) => {
    switch (severity) {
      case "critical":
        return {
          icon: ShieldAlert,
          border:
            "border-red-500 bg-red-50 dark:bg-red-950/30",
          iconColor: "text-red-600",
          titleColor: "text-red-700 dark:text-red-400",
        };

      case "high":
        return {
          icon: AlertTriangle,
          border:
            "border-orange-500 bg-orange-50 dark:bg-orange-950/30",
          iconColor: "text-orange-600",
          titleColor:
            "text-orange-700 dark:text-orange-400",
        };

      case "warning":
        return {
          icon: Activity,
          border:
            "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
          iconColor: "text-yellow-600",
          titleColor:
            "text-yellow-700 dark:text-yellow-400",
        };

      default:
        return {
          icon: Info,
          border:
            "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
          iconColor: "text-blue-600",
          titleColor:
            "text-blue-700 dark:text-blue-400",
        };
    }
  };

  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <Card className="p-6">
          <p className="text-gray-600 dark:text-slate-400">
            No active health alerts detected.
          </p>
        </Card>
      ) : (
        alerts.map((alert) => {
          const styles = getAlertStyles(alert.severity);

          const Icon = styles.icon;

          return (
            <Card
              key={alert.id}
              className={`border-l-4 p-5 ${styles.border}`}
            >
              <div className="flex items-start gap-4">
                <Icon
                  className={`mt-1 h-6 w-6 ${styles.iconColor}`}
                />

                <div className="flex-1">
                  <div
                    className={`text-lg font-semibold ${styles.titleColor}`}
                  >
                    {alert.title}
                  </div>

                  <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">
                    {alert.message}
                  </p>

                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-500">
                    {alert.timestamp}
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