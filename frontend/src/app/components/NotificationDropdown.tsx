import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";

import {
  getAuthToken,
  getNotifications,
  getWebSocketUrl,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationStatusFilter,
} from "../services/api";
import type { HealthAlert } from "../utils/alertEngine";

type Props = {
  alerts: HealthAlert[];
};

type DisplayNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
  serverId?: number;
};

function notificationIcon(type: string) {
  if (["critical", "alert", "escalation"].includes(type)) return ShieldAlert;
  if (["warning", "referral", "assignment"].includes(type)) return AlertTriangle;
  if (type === "success") return CheckCircle2;
  return Info;
}

function notificationColor(type: string, isRead: boolean) {
  if (isRead) return "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";
  if (["critical", "alert", "escalation"].includes(type)) {
    return "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/25";
  }
  if (["referral", "assignment"].includes(type)) {
    return "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/25";
  }
  return "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900";
}

export default function NotificationDropdown({ alerts }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NotificationStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function loadNotifications() {
    if (!getAuthToken()) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getNotifications({
        status: filter,
        search: search.trim() || undefined,
      });
      setNotifications(data);
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Polling remains as a fallback for development servers, proxies, or
    // browsers that temporarily block the production WebSocket connection.
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) return;

    const socketUrl = getWebSocketUrl(
      `/notifications/ws?token=${encodeURIComponent(token)}`
    );
    const socket = new WebSocket(socketUrl);

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };

        if (payload.type === "notifications.updated") {
          loadNotifications();
        }
      } catch {
        loadNotifications();
      }
    });

    return () => socket.close();
  }, [filter]);

  useEffect(() => {
    const timeout = window.setTimeout(loadNotifications, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const displayNotifications = useMemo<DisplayNotification[]>(() => {
    // Merge persisted backend notifications with local clinical alerts so the
    // bell reflects both workflow events and live patient risk changes.
    const serverItems = notifications.map((item) => ({
      id: `server-${item.id}`,
      title: item.title,
      message: item.message,
      type: item.type,
      isRead: item.is_read === "true",
      createdAt: item.created_at,
      link: item.link,
      serverId: item.id,
    }));

    const alertItems = alerts.map((alert) => ({
      id: `alert-${alert.id}`,
      title: alert.title,
      message: alert.message,
      type: alert.severity === "critical" ? "critical" : "alert",
      isRead: false,
      createdAt: alert.timestamp,
      link: "/review-cases",
    }));

    return [...alertItems, ...serverItems];
  }, [alerts, notifications]);

  const unreadCount = displayNotifications.filter((item) => !item.isRead).length;

  async function handleMarkRead(item: DisplayNotification) {
    // Local live alerts do not have backend ids, so only persisted notifications
    // can be marked read through the API.
    if (!item.serverId) return;
    await markNotificationRead(item.serverId);
    await loadNotifications();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    await loadNotifications();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-card absolute right-0 mt-3 w-[min(92vw,430px)] overflow-hidden rounded-2xl shadow-xl">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black">Notification Centre</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assignments, referrals, alerts, and system updates
                </p>
              </div>

              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                All read
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
              <label className="relative block">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search notifications"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                />
              </label>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as NotificationStatusFilter)
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950"
              >
                {/* These filters match the backend enum exactly. */}
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>

          <div className="max-h-[430px] overflow-auto p-3">
            {loading && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:bg-slate-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading notifications...
              </div>
            )}

            {error && !loading && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </p>
            )}

            {!loading && !error && displayNotifications.length === 0 && (
              <p className="rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-400">
                No notifications match your filters.
              </p>
            )}

            {!loading && !error && (
              <div className="space-y-3">
                {displayNotifications.map((item) => {
                  const Icon = notificationIcon(item.type);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-sm ${notificationColor(
                        item.type,
                        item.isRead
                      )}`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 dark:bg-slate-950">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold leading-snug">{item.title}</p>
                            {!item.isRead && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            )}
                          </div>

                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {item.message}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-500">
                              {new Date(item.createdAt).toLocaleString()}
                            </span>

                            <div className="flex items-center gap-2">
                              {item.link && (
                                <a
                                  href={item.link}
                                  className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-300"
                                >
                                  Open
                                </a>
                              )}

                              {!item.isRead && item.serverId && (
                                <button
                                  onClick={() => handleMarkRead(item)}
                                  className="text-xs font-bold text-slate-600 hover:text-blue-700 dark:text-slate-300"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
