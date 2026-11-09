import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";

export type NotificationStatusFilter = "all" | "read" | "unread";

export type AppNotification = {
  id: number;
  user_email?: string | null;
  target_role?: string | null;
  title: string;
  message: string;
  type: string;
  is_read: string;
  link?: string | null;
  related_entity?: string | null;
  related_entity_id?: string | null;
  created_at: string;
  read_at?: string | null;
};

export async function getNotifications(options: {
  status?: NotificationStatusFilter;
  type?: string;
  search?: string;
} = {}) {
  // Filters are encoded as query parameters so the backend can apply scoping,
  // read-state filtering, and search in one database query.
  const params = new URLSearchParams();

  if (options.status) params.set("status", options.status);
  if (options.type) params.set("notification_type", options.type);
  if (options.search) params.set("search", options.search);

  const query = params.toString();
  const response = await apiFetch(
    `${API_BASE_URL}/notifications/${query ? `?${query}` : ""}`
  );

  await ensureOk(response, "Failed to fetch notifications");

  return response.json();
}

export async function createNotification(payload: {
  user_email?: string | null;
  target_role?: string | null;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  related_entity?: string | null;
  related_entity_id?: string | null;
}) {
  const response = await apiFetch(`${API_BASE_URL}/notifications/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  await ensureOk(response, "Failed to create notification");

  return response.json();
}

export async function markNotificationRead(notificationId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    }
  );

  await ensureOk(response, "Failed to mark notification as read");

  return response.json();
}

export async function markAllNotificationsRead() {
  const response = await apiFetch(
    `${API_BASE_URL}/notifications/bulk/mark-all-read`,
    {
      method: "PATCH",
    }
  );

  await ensureOk(response, "Failed to mark all notifications as read");

  return response.json();
}

// linear API functions for analytics
