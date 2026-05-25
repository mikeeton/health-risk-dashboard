import type { HealthData } from "../data/healthData";

export function createLiveVitalsSocket(
  patientId: number,
  onMessage: (record: HealthData) => void,
  onOpen?: () => void,
  onClose?: () => void,
  onError?: () => void
) {
  const socket = new WebSocket(`ws://127.0.0.1:8000/ws/live/${patientId}`);

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