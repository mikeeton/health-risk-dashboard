import type { HealthData } from "../data/healthData";
import { API_BASE_URL, getAuthToken } from "./api";

function getLiveSocketUrl(patientId: number) {
  const apiUrl = new URL(API_BASE_URL);
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = `/ws/live/${patientId}`;
  apiUrl.search = "";

  const token = getAuthToken();

  if (token) {
    apiUrl.searchParams.set("token", token);
  }

  return apiUrl.toString();
}

export function createLiveVitalsSocket(
  patientId: number,
  onMessage: (record: HealthData) => void,
  onOpen?: () => void,
  onClose?: () => void,
  onError?: () => void
) {
  const socket = new WebSocket(getLiveSocketUrl(patientId));

  socket.onopen = () => {
    onOpen?.();
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  socket.onerror = () => {
    onError?.();
  };

  socket.onclose = () => {
    onClose?.();
  };

  return socket;
}
