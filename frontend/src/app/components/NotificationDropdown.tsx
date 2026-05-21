import { useState } from "react";
import { Bell, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import type { HealthAlert } from "../utils/alertEngine";

type Props = {
  alerts: HealthAlert[];
};

export default function NotificationDropdown({ alerts }: Props) {
  const [open, setOpen] = useState(false);

  const getIcon = (severity: HealthAlert["severity"]) => {
    if (severity === "critical") return ShieldAlert;
    if (severity === "high") return AlertTriangle;
    return Info;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-md backdrop-blur transition hover:scale-105 dark:bg-slate-900/80"
      >
        <Bell className="h-5 w-5 text-blue-600" />

        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-card absolute right-0 mt-3 w-[340px] rounded-3xl p-4">
          <div className="mb-3">
            <h3 className="font-bold">Notifications</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest user and clinician alerts
            </p>
          </div>

          {alerts.length === 0 ? (
            <p className="rounded-2xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
              No active notifications.
            </p>
          ) : (
            <div className="max-h-[360px] space-y-3 overflow-auto">
              {alerts.map((alert) => {
                const Icon = getIcon(alert.severity);

                return (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex gap-3">
                      <Icon className="mt-0.5 h-4 w-4 text-blue-600" />

                      <div>
                        <p className="text-sm font-bold">{alert.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}