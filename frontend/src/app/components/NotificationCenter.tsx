import { Bell, CheckCircle, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import { Card } from "./ui/card";
import type { HealthAlert } from "../utils/alertEngine";

type NotificationCenterProps = {
  alerts: HealthAlert[];
};

export default function NotificationCenter({ alerts }: NotificationCenterProps) {
  const unreadCount = alerts.length;

  const getIcon = (severity: HealthAlert["severity"]) => {
    if (severity === "critical") return ShieldAlert;
    if (severity === "high") return AlertTriangle;
    if (severity === "warning") return Bell;
    return Info;
  };

  const getColor = (severity: HealthAlert["severity"]) => {
    if (severity === "critical") return "text-red-600";
    if (severity === "high") return "text-orange-600";
    if (severity === "warning") return "text-yellow-600";
    return "text-blue-600";
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-blue-600" />

          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">
              Notification Center
            </h2>

            <p className="text-sm text-gray-500 dark:text-slate-400">
              User and clinician alert history
            </p>
          </div>
        </div>

        <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
          {unreadCount}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-green-700 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
          <span>No active notifications.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const Icon = getIcon(alert.severity);

            return (
              <div
                key={alert.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start gap-4">
                  <Icon className={`mt-1 h-5 w-5 ${getColor(alert.severity)}`} />

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-950 dark:text-white">
                        {alert.title}
                      </h3>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                        {alert.target}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                      {alert.message}
                    </p>

                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-500">
                      {alert.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}