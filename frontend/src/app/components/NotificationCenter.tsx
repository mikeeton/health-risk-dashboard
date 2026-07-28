import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationStatusFilter,
} from "../services/api";
import {
  announceNotificationsChanged,
  subscribeToNotificationChanges,
} from "../services/notificationEvents";

type Tab = "unread" | "read";

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<Tab>("unread");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    try {
      setError("");
      const status: NotificationStatusFilter = tab;
      setNotifications(
        await getNotifications({
          status,
          search: search.trim() || undefined,
        })
      );
    } catch {
      setError("Unable to load your notification history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void loadNotifications();
  }, [tab]);

  useEffect(() => {
    const timeout = window.setTimeout(loadNotifications, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const unsubscribe = subscribeToNotificationChanges(() => {
      void loadNotifications();
    });
    const interval = window.setInterval(loadNotifications, 30000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [tab, search]);

  async function markRead(notification: AppNotification, openLink = false) {
    setNotifications((items) => items.filter((item) => item.id !== notification.id));
    try {
      await markNotificationRead(notification.id);
      announceNotificationsChanged();
      if (openLink && notification.link) navigate(notification.link);
    } catch {
      setError("Could not move that notification to history.");
      await loadNotifications();
    }
  }

  async function markAllRead() {
    const previous = notifications;
    setNotifications([]);
    try {
      await markAllNotificationsRead();
      announceNotificationsChanged();
    } catch {
      setNotifications(previous);
      setError("Could not move the inbox to history.");
    }
  }

  return (
    <div className="dashboard-shell">
      <section className="glass-card overflow-hidden">
        <header className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
                  Communication centre
                </p>
                <h1 className="mt-1 text-2xl font-extrabold">Notifications</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Live updates move to your private history after you read them.
                </p>
              </div>
            </div>

            {tab === "unread" && notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="clinical-button flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-md hover:bg-blue-700"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "unread"}
                onClick={() => setTab("unread")}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  tab === "unread"
                    ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                    : "text-slate-500"
                }`}
              >
                <Inbox className="h-4 w-4" /> Inbox
              </button>
              <button
                role="tab"
                aria-selected={tab === "read"}
                onClick={() => setTab("read")}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  tab === "read"
                    ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                    : "text-slate-500"
                }`}
              >
                <Archive className="h-4 w-4" /> Read history
              </button>
            </div>

            <label className="relative block w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${tab === "unread" ? "inbox" : "read history"}`}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
        </header>

        <div className="min-h-[340px] p-4 sm:p-6">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading notifications…
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                {tab === "unread" ? <CheckCircle2 /> : <Archive />}
              </div>
              <h2 className="mt-4 text-lg font-extrabold">
                {tab === "unread" ? "You’re all caught up" : "No read notifications yet"}
              </h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                {tab === "unread"
                  ? "New assignments, alerts, referrals, and system updates will appear here automatically."
                  : "Notifications you mark as read are stored here for later reference."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {notifications.map((notification) => {
                const critical = ["critical", "alert", "escalation"].includes(
                  notification.type
                );
                const Icon = critical ? ShieldAlert : Bell;
                return (
                  <article
                    key={notification.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 sm:p-5"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        critical
                          ? "bg-red-50 text-red-600 dark:bg-red-950/40"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="font-extrabold">{notification.title}</h2>
                            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {notification.type}
                            </span>
                          </div>
                          <time className="text-xs text-slate-500">
                            {new Date(notification.created_at).toLocaleString()}
                          </time>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {notification.message}
                        </p>
                        {tab === "unread" && (
                          <div className="mt-4 flex flex-wrap justify-end gap-3">
                            <button
                              onClick={() => markRead(notification)}
                              className="text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
                            >
                              Mark as read
                            </button>
                            {notification.link && (
                              <button
                                onClick={() => markRead(notification, true)}
                                className="flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
                              >
                                Open and mark read <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
