const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");

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
  return localStorage.getItem("health-auth-token");
}

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  // Centralize Bearer-token attachment so pages/components do not duplicate
  // authentication code or accidentally call protected endpoints anonymously.
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return window.fetch(input, {
    ...init,
    headers,
  });
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
  const response = await apiFetch(`${API_BASE_URL}/auth/register`, {
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
  const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
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

export async function getAIPatientSummary(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/assistant/patient-summary/${patientId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch AI patient summary");
  }

  return response.json();
}

export async function askHealthAI(patientId: number, question: string) {
  const response = await apiFetch(
    `${API_BASE_URL}/assistant/ask/${patientId}?question=${encodeURIComponent(
      question
    )}`
  );

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
