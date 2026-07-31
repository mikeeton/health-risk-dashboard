import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router";

import {
  getAuthToken,
  getNotifications,
  getWebSocketUrl,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "../services/api";
import {
  announceNotificationsChanged,
  subscribeToNotificationChanges,
} from "../services/notificationEvents";
import { useAuth } from "../context/AuthContext";
function notificationIcon(type: string) {
  if (["critical", "alert", "escalation"].includes(type)) return ShieldAlert;
  if (["warning", "referral", "assignment"].includes(type)) return AlertTriangle;
  if (type === "success") return CheckCircle2;
  return Info;
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

type ConnectionState = "connecting" | "live" | "fallback";

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  const loadNotifications = useCallback(async () => {
    if (!getAuthToken()) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      setError("");
      setNotifications(await getNotifications({ status: "unread" }));
    } catch {
      setError("Live notifications are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const unsubscribe = subscribeToNotificationChanges(() => {
      void loadNotifications();
    });
    const interval = window.setInterval(loadNotifications, 30000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [loadNotifications, token]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!token) return;

    let socket: WebSocket | null = null;
    let cancelled = false;
    let reconnectTimer: number | undefined;
    let attempts = 0;

    const connect = () => {
      if (cancelled) return;
      setConnectionState("connecting");
      socket = new WebSocket(
        getWebSocketUrl(`/notifications/ws?token=${encodeURIComponent(token)}`)
      );
      socket.addEventListener("open", () => {
        attempts = 0;
        setConnectionState("live");
      });
      socket.addEventListener("message", () => {
        void loadNotifications();
        announceNotificationsChanged();
      });
      socket.addEventListener("close", () => {
        if (cancelled) return;
        setConnectionState("fallback");
        attempts += 1;
        const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts, 5));
        reconnectTimer = window.setTimeout(connect, delay);
      });
      socket.addEventListener("error", () => socket?.close());
    };

    const connectTimer = window.setTimeout(connect, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(connectTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [loadNotifications, token]);

  async function markRead(notification: AppNotification, openLink = false) {
    setNotifications((items) => items.filter((item) => item.id !== notification.id));
    try {
      await markNotificationRead(notification.id);
      announceNotificationsChanged();
      if (openLink && notification.link) {
        setOpen(false);
        navigate(notification.link);
      }
    } catch {
      setError("Could not mark that notification as read.");
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
      setError("Could not clear the notification inbox.");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
          className={`app-icon-button relative text-blue-600 ${notifications.length ? "animate-[pulse_2s_ease-in-out_1]" : ""}`}
        aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="glass-card absolute right-0 z-50 mt-3 w-[min(92vw,420px)] overflow-hidden shadow-2xl"
          role="dialog"
          aria-label="Unread notifications"
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold">Live notifications</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${connectionState === "live" ? "bg-emerald-500" : connectionState === "connecting" ? "bg-amber-400" : "bg-slate-400"}`} />
                {connectionState === "live" ? "Live updates connected" : connectionState === "connecting" ? "Connecting to live updates" : "Reconnecting · 30-second backup refresh active"}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </header>

          <div className="max-h-[410px] overflow-y-auto p-3">
            {error && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                <span>{error}</span>
                <button onClick={() => void loadNotifications()} className="shrink-0 font-extrabold underline">Retry</button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading live updates…
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-7 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-3 font-bold">You’re all caught up</p>
                <p className="mt-1 text-sm text-slate-500">
                  Read notifications remain in your history.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = notificationIcon(notification.type);
                  return (
                    <article
                      key={notification.id}
                      className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/20"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold leading-snug">{notification.title}</h4>
                          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                            {notification.message}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <time className="text-[11px] font-medium text-slate-500">
                              <span title={new Date(notification.created_at).toLocaleString()}>{relativeTime(notification.created_at)}</span>
                            </time>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => markRead(notification)}
                                className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-300"
                              >
                                Mark read
                              </button>
                              {notification.link && (
                                <button
                                  onClick={() => markRead(notification, true)}
                                  className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline dark:text-blue-300"
                                >
                                  Open <ExternalLink className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className="w-full border-t border-slate-200 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-slate-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
          >
            Open notification history
          </button>
        </div>
      )}
    </div>
  );
}
