import { API_BASE_URL, apiFetch, getWebSocketUrl } from "./api";

type SocketAudience = "live_vitals" | "notifications";

export async function getTicketedWebSocketUrl(
  path: string,
  audience: SocketAudience,
  patientId?: number
) {
  const response = await apiFetch(`${API_BASE_URL}/auth/websocket-ticket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audience,
      patient_id: patientId,
    }),
  });
  if (!response.ok) throw new Error("Could not authorize live updates");

  const { ticket } = (await response.json()) as { ticket: string };
  const url = new URL(getWebSocketUrl(path));
  url.searchParams.set("ticket", ticket);
  return url.toString();
}
