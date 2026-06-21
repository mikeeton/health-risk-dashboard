import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationStatusFilter,
} from "../services/api";
import type { HealthAlert } from "../utils/alertEngine";

type NotificationCenterProps = {
  alerts: HealthAlert[];
};

export default function NotificationCenter({ alerts }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<NotificationStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const data = await getNotifications({
        status: filter,
        search: search.trim() || undefined,
      });
      setNotifications(data);
    } catch {
      setError("Unable to load notification history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The full centre reloads when the filter changes so history stays
    // server-scoped rather than filtered only in the browser.
    loadNotifications();
  }, [filter]);

  useEffect(() => {
    const timeout = window.setTimeout(loadNotifications, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const merged = useMemo(() => {
    // Dashboard-generated clinical alerts are not persisted, but presenting
    // them alongside saved notifications keeps the user workflow consistent.
    const activeAlerts = alerts.map((alert) => ({
      id: `alert-${alert.id}`,
      title: alert.title,
      message: alert.message,
      type: alert.severity === "critical" ? "critical" : "alert",
      isRead: false,
      createdAt: alert.timestamp,
      serverId: undefined as number | undefined,
    }));

    const saved = notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.is_read === "true",
      createdAt: notification.created_at,
      serverId: notification.id,
    }));

    return [...activeAlerts, ...saved];
  }, [alerts, notifications]);

  const unreadCount = merged.filter((item) => !item.isRead).length;

  async function markRead(notificationId?: number) {
    // Only persisted notifications have ids; live alerts clear when their
    // underlying clinical condition changes.
    if (!notificationId) return;
    await markNotificationRead(notificationId);
    await loadNotifications();
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    await loadNotifications();
  }

  return (
    <section className="glass-card p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">
              Notification Center
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Searchable history for alerts, referrals, assignments, and system updates
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
            {unreadCount} unread
          </span>
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_150px]">
        <label className="relative block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notification history"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-800 dark:bg-slate-950"
          />
        </label>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as NotificationStatusFilter)
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-slate-500 dark:bg-slate-900">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading notifications...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : merged.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-green-700 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
          <span>No notifications match your filters.</span>
        </div>
      ) : (
        <div className="grid gap-3">
          {merged.map((item) => {
            const isCritical = ["critical", "alert"].includes(item.type);

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
                  item.isRead
                    ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                    : "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20"
                }`}
              >
                <div className="flex gap-4">
                  {isCritical ? (
                    <ShieldAlert className="mt-1 h-5 w-5 text-red-600" />
                  ) : (
                    <Bell className="mt-1 h-5 w-5 text-blue-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-950 dark:text-white">
                        {item.title}
                      </h3>
                      {!item.isRead && (
                        <span className="rounded-full bg-blue-600 px-2 py-1 text-[11px] font-black uppercase text-white">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                      {item.message}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                      {!item.isRead && item.serverId && (
                        <button
                          onClick={() => markRead(item.serverId)}
                          className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-300"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
