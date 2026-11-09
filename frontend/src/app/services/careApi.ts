import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";

export type CareAppointment = {
  id: number;
  patient_id: number;
  clinician_user_id: number;
  starts_at: string;
  duration_minutes: number;
  appointment_type: string;
  location?: string | null;
  status: string;
  reason?: string | null;
  cancellation_reason?: string | null;
};

export type CareMessage = {
  id: number;
  patient_id: number;
  sender_user_id: number;
  recipient_user_id: number;
  subject: string;
  body: string;
  created_at: string;
  read_at?: string | null;
};

export type CareTask = {
  id: number;
  patient_id: number;
  assigned_to_user_id: number;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  due_at?: string | null;
  status: string;
  completion_note?: string | null;
};

export type ClinicalDocument = {
  id: number;
  patient_id: number;
  author_user_id: number;
  document_type: string;
  title: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  terminology_code?: string | null;
  terminology_system?: string | null;
  version: number;
  status: string;
  patient_visible: boolean;
  signed_at?: string | null;
  created_at: string;
};

export type ConsentRecord = {
  id: number;
  patient_id: number;
  consent_type: string;
  granted: boolean;
  policy_version: string;
  recorded_at: string;
};

export async function careRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await apiFetch(`${API_BASE_URL}/care${path}`, {
    ...init,
    headers,
  });
  await ensureOk(response, "Care workflow request failed");
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const getCareProfile = () => careRequest<Record<string, unknown>>("/account/profile");
export const updateCareProfile = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/account/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const changeOwnPassword = (payload: {
  current_password: string;
  new_password: string;
}) =>
  careRequest<void>("/account/password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getOwnSessions = () =>
  careRequest<Array<{ id: number; created_at: string; expires_at: string; revoked_at?: string | null }>>("/account/sessions");
export const revokeOwnSession = (id: number) =>
  careRequest<void>(`/account/sessions/${id}`, { method: "DELETE" });
export const enrolMFA = () =>
  careRequest<{ secret: string; otpauth_uri: string; warning: string }>("/account/mfa/enrol", { method: "POST" });
export const confirmMFA = (code: string) =>
  careRequest<void>("/account/mfa/confirm", { method: "POST", body: JSON.stringify({ code }) });
export const disableMFA = (password: string, code: string) =>
  careRequest<void>("/account/mfa/disable", { method: "POST", body: JSON.stringify({ password, code }) });
export const getAppointments = (patientId: number) =>
  careRequest<CareAppointment[]>(`/appointments/${patientId}`);
export const getCareTeam = (patientId: number) =>
  careRequest<Array<{ id: number; full_name: string; email: string; role: string; job_title?: string | null; department?: string | null }>>(`/team/${patientId}`);
export const createAppointment = (payload: Record<string, unknown>) =>
  careRequest<CareAppointment>("/appointments", { method: "POST", body: JSON.stringify(payload) });
export const updateAppointment = (id: number, payload: Record<string, unknown>) =>
  careRequest<CareAppointment>(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const getCareMessages = (patientId: number) =>
  careRequest<CareMessage[]>(`/messages/${patientId}`);
export const sendCareMessage = (payload: Record<string, unknown>) =>
  careRequest<CareMessage>("/messages", { method: "POST", body: JSON.stringify(payload) });
export const getCareTasks = (patientId: number) =>
  careRequest<CareTask[]>(`/tasks/${patientId}`);
export const createCareTask = (payload: Record<string, unknown>) =>
  careRequest<CareTask>("/tasks", { method: "POST", body: JSON.stringify(payload) });
export const updateCareTask = (id: number, payload: Record<string, unknown>) =>
  careRequest<CareTask>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const getConsents = (patientId: number) =>
  careRequest<ConsentRecord[]>(`/consents/${patientId}`);
export const recordConsent = (payload: Record<string, unknown>) =>
  careRequest<ConsentRecord>("/consents", { method: "POST", body: JSON.stringify(payload) });
export const getClinicalDocuments = (patientId: number) =>
  careRequest<ClinicalDocument[]>(`/documents/${patientId}`);
export const createClinicalDocument = (payload: Record<string, unknown>) =>
  careRequest<ClinicalDocument>("/documents", { method: "POST", body: JSON.stringify(payload) });
export const signClinicalDocument = (id: number) =>
  careRequest<ClinicalDocument>(`/documents/${id}/sign`, { method: "POST" });
export const getPatientOutcomes = (patientId: number) =>
  careRequest<Array<Record<string, unknown>>>(`/outcomes/${patientId}`);
export const createPatientOutcome = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/outcomes", { method: "POST", body: JSON.stringify(payload) });
export const getDataRequests = () =>
  careRequest<Array<Record<string, unknown>>>("/data-requests");
export const resolveDataRequest = (id: number, payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>(`/data-requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const createDataRequest = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/data-requests", { method: "POST", body: JSON.stringify(payload) });
export const exportPatientRecord = (patientId: number) =>
  careRequest<Record<string, unknown>>(`/export/${patientId}`);
export const getMedicationAdministrations = (patientId: number) =>
  careRequest<Array<Record<string, unknown>>>(`/medication-administrations/${patientId}`);
export const recordMedicationAdministration = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/medication-administrations", { method: "POST", body: JSON.stringify(payload) });
export const getInvestigations = (patientId: number) =>
  careRequest<Array<Record<string, unknown>>>(`/investigations/${patientId}`);
export const orderInvestigation = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/investigations", { method: "POST", body: JSON.stringify(payload) });
export const getNursingAssessments = (patientId: number) =>
  careRequest<Array<Record<string, unknown>>>(`/nursing-assessments/${patientId}`);
export const createNursingAssessment = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/nursing-assessments", { method: "POST", body: JSON.stringify(payload) });
export const getObservationSchedules = (patientId: number) =>
  careRequest<Array<Record<string, unknown>>>(`/observation-schedules/${patientId}`);
export const createObservationSchedule = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/observation-schedules", { method: "POST", body: JSON.stringify(payload) });
export const getAlertWorkflows = (patientId: number) =>
  careRequest<Array<Record<string, unknown>>>(`/alerts/${patientId}`);
export const updateAlertWorkflow = (id: number, payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>(`/alerts/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const getMedicationSafety = (patientId: number) =>
  careRequest<Record<string, unknown>>(`/medication-safety/${patientId}`);
export const getAdminOperations = () =>
  careRequest<Record<string, unknown>>("/admin/operations");
export const getPreemptiveMonitoring = () =>
  careRequest<{ enabled: boolean; interval_minutes: number; updated_at?: string | null }>("/admin/preemptive-monitoring");
export const setPreemptiveMonitoring = (payload: { enabled: boolean; interval_minutes: number }) =>
  careRequest<{ enabled: boolean; interval_minutes: number; updated_at?: string | null }>("/admin/preemptive-monitoring", { method: "PUT", body: JSON.stringify(payload) });
export type ModelGovernanceSettings = {
  enabled: boolean; mode: "shadow" | "live"; threshold: number | null;
  false_negative_cost: number; false_positive_cost: number;
  require_consecutive: number; require_trend_confirmation: boolean;
  drift_threshold: number; auto_suspend: boolean; active_model_version: string;
  retirement_reason?: string | null;
};
export const getModelGovernance = () => careRequest<ModelGovernanceSettings>("/admin/model-governance");
export const setModelGovernance = (payload: ModelGovernanceSettings & { reason: string }) =>
  careRequest<ModelGovernanceSettings>("/admin/model-governance", { method: "PUT", body: JSON.stringify(payload) });
export const getModelQuality = () => careRequest<Record<string, unknown>>("/admin/model-quality");
export const getSystemIncidents = () =>
  careRequest<Array<Record<string, unknown>>>("/admin/incidents");
export const getOrganisationUnits = () =>
  careRequest<Array<Record<string, unknown>>>("/admin/organisation-units");
export const createOrganisationUnit = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/admin/organisation-units", { method: "POST", body: JSON.stringify(payload) });
export const getRolePermissions = () =>
  careRequest<Array<Record<string, unknown>>>("/admin/permissions");
export const setRolePermission = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/admin/permissions", { method: "PUT", body: JSON.stringify(payload) });
export const getNotificationRules = () =>
  careRequest<Array<Record<string, unknown>>>("/admin/notification-rules");
export const createNotificationRule = (payload: Record<string, unknown>) =>
  careRequest<Record<string, unknown>>("/admin/notification-rules", { method: "POST", body: JSON.stringify(payload) });
export const exportAdminUsers = () =>
  careRequest<Record<string, unknown>>("/admin/users-export");
