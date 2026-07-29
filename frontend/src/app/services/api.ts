const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

if (
  import.meta.env.PROD &&
  import.meta.env.VITE_API_BASE_URL &&
  !configuredApiBaseUrl.startsWith("https://")
) {
  throw new Error("Production VITE_API_BASE_URL must use HTTPS.");
}

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");
export const AUTH_EXPIRED_EVENT = "health-auth-expired";
export const AUTH_TOKEN_REFRESHED_EVENT = "health-auth-token-refreshed";

let refreshRequest: Promise<string | null> | null = null;

export function getWebSocketUrl(path: string) {
  const apiUrl = new URL(API_BASE_URL);
  const [pathname, query = ""] = path.split("?");
  const url = new URL(apiUrl.toString());

  url.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${apiUrl.pathname.replace(/\/+$/, "")}/${pathname.replace(
    /^\/+/,
    ""
  )}`;
  url.search = query ? `?${query}` : "";

  return url.toString();
}

export function getAuthToken() {
  return sessionStorage.getItem("health-auth-token");
}

function clearStoredSession() {
  sessionStorage.removeItem("health-auth-user");
  sessionStorage.removeItem("health-auth-token");
  sessionStorage.removeItem("health-refresh-token");
}

function expireSession() {
  clearStoredSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem("health-refresh-token");
  if (!refreshToken) return null;

  const response = await window.fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
  };
  sessionStorage.setItem("health-auth-token", data.access_token);
  sessionStorage.setItem("health-refresh-token", data.refresh_token);
  window.dispatchEvent(
    new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, {
      detail: { accessToken: data.access_token },
    })
  );
  return data.access_token;
}

async function getRefreshedAccessToken() {
  if (!refreshRequest) {
    refreshRequest = refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  // Centralize Bearer-token attachment so pages/components do not duplicate
  // authentication code or accidentally call protected endpoints anonymously.
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await window.fetch(input, {
    ...init,
    headers,
  });
  if (response.status !== 401 || !token) return response;

  const currentToken = getAuthToken();
  if (currentToken && currentToken !== token) {
    const currentHeaders = new Headers(init.headers);
    currentHeaders.set("Authorization", `Bearer ${currentToken}`);
    return window.fetch(input, { ...init, headers: currentHeaders });
  }

  const refreshedToken = await getRefreshedAccessToken();
  if (refreshedToken) {
    const retryHeaders = new Headers(init.headers);
    retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
    const retryResponse = await window.fetch(input, {
      ...init,
      headers: retryHeaders,
    });
    if (retryResponse.status === 401) expireSession();
    return retryResponse;
  }

  expireSession();
  return response;
}

export async function getPatients() {
  const response = await apiFetch(`${API_BASE_URL}/patients`);

  if (!response.ok) {
    throw new Error("Failed to fetch patients");
  }

  return response.json();
}

export async function createPatient(patient: unknown) {
  const response = await apiFetch(`${API_BASE_URL}/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patient),
  });

  if (!response.ok) {
    throw new Error("Failed to create patient");
  }

  return response.json();
}

export async function deletePatient(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/patients/${patientId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete patient");
  }

  return response.json();
}

export async function getVitals(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/vitals/${patientId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch vitals");
  }

  return response.json();
}

export async function createVital(vital: unknown) {
  const response = await apiFetch(`${API_BASE_URL}/vitals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(vital),
  });

  if (!response.ok) {
    throw new Error("Failed to create vital");
  }

  return response.json();
}

export async function deleteVital(vitalId: string | number) {
  const response = await apiFetch(`${API_BASE_URL}/vitals/${vitalId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete vital");
  }

  return response.json();
}

export async function registerUser(user: unknown) {
  const response = await window.fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    throw new Error("Failed to register user");
  }

  return response.json();
}

export async function loginUser(credentials: unknown) {
  const response = await window.fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error("Invalid email or password");
  }

  return response.json();
}

export async function logoutUser(refreshToken: string | null) {
  if (!refreshToken) return;
  await window.fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function createReviewCase(review: unknown) {
  const response = await apiFetch(`${API_BASE_URL}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(review),
  });

  if (!response.ok) {
    throw new Error("Failed to create review case");
  }

  return response.json();
}

export async function getReviewCases() {
  const response = await apiFetch(`${API_BASE_URL}/reviews`);

  if (!response.ok) {
    throw new Error("Failed to fetch review cases");
  }

  return response.json();
}

export async function updateReviewCase(
  caseId: number,
  update: unknown
) {
  const response = await apiFetch(`${API_BASE_URL}/reviews/${caseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    throw new Error("Failed to update review case");
  }

  return response.json();
}

export async function getAuditLogs() {
  const response = await apiFetch(`${API_BASE_URL}/audit/`);

  if (!response.ok) {
    throw new Error("Failed to fetch audit logs");
  }

  return response.json();
}

export async function getMedications(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/medications/${patientId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch medications");
  }

  return response.json();
}

export async function createMedication(payload: {
  patient_id: number;
  name: string;
  dosage: string;
  schedule_time: string;
  status: string;
  notes?: string;
}) {
  const response = await apiFetch(`${API_BASE_URL}/medications/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create medication");
  }

  return response.json();
}

export async function updateMedication(
  medicationId: number,
  payload: {
    status: string;
    notes?: string;
  }
) {
  const response = await apiFetch(`${API_BASE_URL}/medications/${medicationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update medication");
  }

  return response.json();
}

export async function getPatientEvents(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/events/${patientId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch patient events");
  }

  return response.json();
}

export async function createPatientEvent(payload: {
  patient_id: number;
  event_type: string;
  title: string;
  description?: string;
  timestamp: string;
}) {
  const response = await apiFetch(`${API_BASE_URL}/events/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create patient event");
  }

  return response.json();
}

export async function getMLPrediction(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/ml/predict/${patientId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch ML prediction");
  }

  return response.json();
}

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

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

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

  if (!response.ok) {
    throw new Error("Failed to create notification");
  }

  return response.json();
}

export async function markNotificationRead(notificationId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }

  return response.json();
}

export async function markAllNotificationsRead() {
  const response = await apiFetch(
    `${API_BASE_URL}/notifications/bulk/mark-all-read`,
    {
      method: "PATCH",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }

  return response.json();
}

// linear API functions for analytics
export async function getLinearRegressionForecast(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/analytics/linear-regression/${patientId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch linear regression forecast");
  }

  return response.json();
}

export async function getSystemSummary() {
  const response = await apiFetch(`${API_BASE_URL}/analytics/system-summary`);

  if (!response.ok) {
    throw new Error("Failed to fetch system summary");
  }

  return response.json();
}

export type AIEvidenceCitation = {
  source_id: string;
  source_type: "vital" | "medication" | "event";
  timestamp?: string | null;
  observation: string;
  relevance: string;
};

export type ClinicalAIOutput = {
  risk_level: "Low" | "Medium" | "High" | "Critical" | "Unknown";
  summary: string;
  supporting_evidence: AIEvidenceCitation[];
  missing_information: string[];
  recommended_checks: string[];
  escalation_conditions: string[];
  confidence: number;
  safety_warning: string;
};

export type ClinicalAIResponse = {
  response_id: string;
  patient_id: number;
  model_used: string;
  prompt_version: string;
  generated_at: string;
  data_freshness: {
    latest_observation_at?: string | null;
    age_hours?: number | null;
    is_stale: boolean;
    threshold_hours: number;
  };
  provider_status: string;
  requires_human_review: boolean;
  output: ClinicalAIOutput;
  summary: string;
  answer: string;
  question?: string;
};

export async function getAIPatientSummary(patientId: number): Promise<ClinicalAIResponse> {
  const response = await apiFetch(
    `${API_BASE_URL}/assistant/patient-summary/${patientId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch AI patient summary");
  }

  return response.json();
}

export async function askHealthAI(
  patientId: number,
  question: string
): Promise<ClinicalAIResponse> {
  const response = await apiFetch(`${API_BASE_URL}/assistant/ask/${patientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error("Failed to ask Health AI");
  }

  return response.json();
}

export async function createRegistrationRequest(payload: {
  email: string;
  full_name: string;
  role: string;
  password: string;
  age?: number | null;
  gender?: string | null;
  conditions?: string | null;
  medication_notes?: string | null;
  lifestyle_notes?: string | null;
}) {
  const response = await apiFetch(`${API_BASE_URL}/registration-requests/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to submit registration request");
  }

  return response.json();
}

export async function generateLiveSimulatorVital(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/live-simulator/generate/${patientId}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to generate live simulator vital");
  }

  return response.json();
}

export async function getWithingsStatus(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/integrations/withings/status/${patientId}`
  );
  if (!response.ok) throw new Error("Failed to load Withings status");
  return response.json();
}

export async function clearAIMemory(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/assistant/memory/${patientId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Failed to clear AI memory");
  return response.json();
}

export async function submitAIFeedback(
  patientId: number,
  payload: {
    response_id: string;
    rating: "helpful" | "not_helpful";
    comment?: string;
  }
) {
  const response = await apiFetch(
    `${API_BASE_URL}/assistant/feedback/${patientId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) throw new Error("Failed to submit AI feedback");
  return response.json();
}

export async function getAIConfiguration() {
  const response = await apiFetch(`${API_BASE_URL}/assistant/configuration`);
  if (!response.ok) throw new Error("Failed to fetch AI configuration");
  return response.json();
}

export async function getWithingsConnectUrl(
  patientId: number,
  demo = false
) {
  const response = await apiFetch(
    `${API_BASE_URL}/integrations/withings/connect/${patientId}?demo=${demo}`
  );
  if (!response.ok) throw new Error("Withings is not configured");
  return response.json();
}

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
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Care workflow request failed");
  }
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

export async function disconnectWithings(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/integrations/withings/connection/${patientId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("Failed to disconnect Withings");
}

export async function getRegistrationRequests() {
  const response = await apiFetch(`${API_BASE_URL}/registration-requests/`);

  if (!response.ok) {
    throw new Error("Failed to fetch registration requests");
  }

  return response.json();
}

export async function approveRegistrationRequest(requestId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/registration-requests/${requestId}/approve`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to approve request");
  }

  return response.json();
}

export async function rejectRegistrationRequest(requestId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/registration-requests/${requestId}/reject`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to reject request");
  }

  return response.json();
}

// doctor clinician API functions for role-based actions

export type DoctorClinicalNoteType = "Clinical Note" | "Diagnosis" | "Treatment Plan";

export async function doctorAddClinicalNote(
  patientId: number,
  title: string,
  description: string,
  noteType: DoctorClinicalNoteType = "Clinical Note"
) {
  const response = await apiFetch(`${API_BASE_URL}/role-actions/doctor/clinical-note`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patient_id: patientId,
      note_type: noteType,
      title,
      description,
    }),
  });

  if (!response.ok) throw new Error("Failed to add clinical note");
  return response.json();
}

export async function doctorEscalatePatient(patientId: number, note: string) {
  const response = await apiFetch(`${API_BASE_URL}/role-actions/doctor/escalate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patient_id: patientId,
      note,
    }),
  });

  if (!response.ok) throw new Error("Failed to escalate patient");
  return response.json();
}

export async function getDoctorPatientHistory(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/role-actions/doctor/patient-history/${patientId}`
  );

  if (!response.ok) throw new Error("Failed to fetch history");
  return response.json();
}

type NurseVitalsPayload = {
  patient_id: number;
  timestamp: string;
  heart_rate: number;
  spo2: number;
  systolic_bp: number;
  diastolic_bp: number;
  steps: number;
  sleep_hours: number;
  active_minutes: number;
  calories: number;
  risk_score: number;
  activity_state: string;
};

export async function nurseRecordVitals(payload: NurseVitalsPayload) {
  const response = await apiFetch(
    `${API_BASE_URL}/role-actions/nurse/record-vitals`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) throw new Error("Failed to record vitals");
  return response.json();
}

export async function nurseMarkMedicationGiven(medicationId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/role-actions/nurse/mark-medication-given/${medicationId}`,
    { method: "POST" }
  );

  if (!response.ok) throw new Error("Failed to mark medication");
  return response.json();
}

export async function nurseAddNursingNote(
  patientId: number,
  title: string,
  description: string
) {
  const response = await apiFetch(`${API_BASE_URL}/role-actions/nurse/nursing-note`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patient_id: patientId,
      title,
      description,
    }),
  });

  if (!response.ok) throw new Error("Failed to add nursing note");
  return response.json();
}

export async function nurseRaiseAlert(patientId: number, note: string) {
  const response = await apiFetch(`${API_BASE_URL}/role-actions/nurse/raise-alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patient_id: patientId,
      note,
    }),
  });

  if (!response.ok) throw new Error("Failed to raise alert");
  return response.json();
}

export async function getPatientOwnRecords(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/role-actions/patient/my-records/${patientId}`
  );

  if (!response.ok) throw new Error("Failed to fetch patient records");
  return response.json();
}

export async function getAdminUsers() {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/`);

  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

export async function suspendAdminUser(userId: number) {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}/suspend`, {
    method: "PATCH",
  });

  if (!response.ok) throw new Error("Failed to suspend user");
  return response.json();
}

export async function activateAdminUser(userId: number) {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}/activate`, {
    method: "PATCH",
  });

  if (!response.ok) throw new Error("Failed to activate user");
  return response.json();
}

export async function resetAdminUserPassword(
  userId: number,
  payload: {
    admin_password: string;
    new_password: string;
  }
) {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Failed to reset password");
  return response.json();
}

export async function createAdminPasswordResetLink(userId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/users/${userId}/password-reset-link`,
    { method: "POST" }
  );
  if (!response.ok) throw new Error("Failed to create password reset link");
  return response.json() as Promise<{ reset_url: string; expires_at: string; delivery: string }>;
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const response = await window.fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Password reset failed");
  }
}

export async function getAdminAssignmentPatients() {
  const response = await apiFetch(`${API_BASE_URL}/admin/assignments/patients`);

  if (!response.ok) throw new Error("Failed to fetch assignment patients");
  return response.json();
}

export async function getAdminAssignmentStaff() {
  const response = await apiFetch(`${API_BASE_URL}/admin/assignments/staff`);

  if (!response.ok) throw new Error("Failed to fetch assignment staff");
  return response.json();
}

export async function getAdminAssignments() {
  const response = await apiFetch(`${API_BASE_URL}/admin/assignments/`);

  if (!response.ok) throw new Error("Failed to fetch staff assignments");
  return response.json();
}

export async function createAdminAssignment(payload: {
  patient_id: number;
  staff_user_id: number;
  role: "doctor" | "nurse";
}) {
  const response = await apiFetch(`${API_BASE_URL}/admin/assignments/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Failed to create staff assignment");
  return response.json();
}

export async function removeAdminAssignment(assignmentId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/assignments/${assignmentId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) throw new Error("Failed to remove staff assignment");
  return response.json();
}

export type ReferralPayload = {
  patient_id: number;
  receiving_user_id?: number | null;
  receiving_department?: string | null;
  reason: string;
  urgency: "Low" | "Medium" | "High" | "Critical";
  notes?: string | null;
};

export type ReferralReviewPayload = {
  admin_note?: string | null;
};

export async function getReferralStaff() {
  const response = await apiFetch(`${API_BASE_URL}/referrals/staff`);

  if (!response.ok) throw new Error("Failed to fetch referral staff");
  return response.json();
}

export async function getReferrals(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiFetch(`${API_BASE_URL}/referrals/${query}`);

  if (!response.ok) throw new Error("Failed to fetch referrals");
  return response.json();
}

export async function createReferral(payload: ReferralPayload) {
  // Creating a referral only creates a request. The backend grants patient
  // access later, and only if an admin approves the request.
  const response = await apiFetch(`${API_BASE_URL}/referrals/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Failed to create referral");
  return response.json();
}

export async function approveReferral(
  referralId: number,
  payload: ReferralReviewPayload
) {
  // Approval is admin-only on the backend and creates the care-team assignment.
  const response = await apiFetch(`${API_BASE_URL}/referrals/${referralId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Failed to approve referral");
  return response.json();
}

export async function rejectReferral(
  referralId: number,
  payload: ReferralReviewPayload
) {
  const response = await apiFetch(`${API_BASE_URL}/referrals/${referralId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Failed to reject referral");
  return response.json();
}

export async function requestReferralMoreInfo(
  referralId: number,
  payload: ReferralReviewPayload
) {
  const response = await apiFetch(
    `${API_BASE_URL}/referrals/${referralId}/more-info`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) throw new Error("Failed to request more information");
  return response.json();
}
