import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";

export async function getWithingsStatus(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/integrations/withings/status/${patientId}`
  );
  await ensureOk(response, "Failed to load Withings status");
  return response.json();
}

export type DeviceObservation = {
  id: number;
  source: "withings" | "wearable";
  measured_at: string;
  received_at: string;
  measurements: Record<string, number>;
  missing_fields: string[];
  assessment_state: string;
};

export async function getDeviceObservations(patientId: number): Promise<DeviceObservation[]> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/withings/observations/${patientId}`);
  await ensureOk(response, "Failed to load device observations");
  return response.json();
}

export type DeviceSyncAttempt = {
  id: number;
  provider: string;
  attempted_at: string;
  completed_at: string | null;
  state: "pending" | "success" | "error";
  accepted_complete: number;
  accepted_partial: number;
  rejected: number;
  error_code: string | null;
  error_message: string | null;
};

export async function getDeviceSyncHistory(patientId: number): Promise<DeviceSyncAttempt[]> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/withings/sync-history/${patientId}`);
  await ensureOk(response, "Failed to load device sync history");
  return response.json();
}

export async function getWithingsConnectUrl(
  patientId: number,
  demo = false
) {
  const response = await apiFetch(
    `${API_BASE_URL}/integrations/withings/connect/${patientId}?demo=${demo}`
  );
  await ensureOk(response, "Withings is not configured");
  return response.json();
}

export async function disconnectWithings(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/integrations/withings/connection/${patientId}`,
    { method: "DELETE" }
  );
  await ensureOk(response, "Failed to disconnect Withings");
}
