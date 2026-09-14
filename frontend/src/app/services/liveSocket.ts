import type { HealthData } from "../data/healthData";
import { getTicketedWebSocketUrl } from "./socketAuth";

export async function createLiveVitalsSocket(
  patientId: number,
  onMessage: (record: HealthData) => void,
  onOpen?: () => void,
  onClose?: () => void,
  onError?: () => void
) {
  const socketUrl = await getTicketedWebSocketUrl(
    `/ws/live/${patientId}`,
    "live_vitals",
    patientId
  );
  const socket = new WebSocket(socketUrl);

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
