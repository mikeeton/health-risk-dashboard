const API_BASE_URL = "http://127.0.0.1:8000";

export async function getPatients() {
  const response = await fetch(`${API_BASE_URL}/patients`);

  if (!response.ok) {
    throw new Error("Failed to fetch patients");
  }

  return response.json();
}

export async function createPatient(patient: unknown) {
  const response = await fetch(`${API_BASE_URL}/patients`, {
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
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete patient");
  }

  return response.json();
}

export async function getVitals(patientId: number) {
  const response = await fetch(`${API_BASE_URL}/vitals/${patientId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch vitals");
  }

  return response.json();
}

export async function createVital(vital: unknown) {
  const response = await fetch(`${API_BASE_URL}/vitals`, {
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
  const response = await fetch(`${API_BASE_URL}/vitals/${vitalId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete vital");
  }

  return response.json();
}

export async function registerUser(user: unknown) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
  const response = await fetch(`${API_BASE_URL}/reviews`, {
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
  const response = await fetch(`${API_BASE_URL}/reviews`);

  if (!response.ok) {
    throw new Error("Failed to fetch review cases");
  }

  return response.json();
}

export async function updateReviewCase(
  caseId: number,
  update: unknown
) {
  const response = await fetch(`${API_BASE_URL}/reviews/${caseId}`, {
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
  const response = await fetch(`${API_BASE_URL}/audit/`);

  if (!response.ok) {
    throw new Error("Failed to fetch audit logs");
  }

  return response.json();
}

export async function getMedications(patientId: number) {
  const response = await fetch(`${API_BASE_URL}/medications/${patientId}`);

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
  const response = await fetch(`${API_BASE_URL}/medications/`, {
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
  const response = await fetch(`${API_BASE_URL}/medications/${medicationId}`, {
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
  const response = await fetch(`${API_BASE_URL}/events/${patientId}`);

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
  const response = await fetch(`${API_BASE_URL}/events/`, {
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
  const response = await fetch(`${API_BASE_URL}/ml/predict/${patientId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch ML prediction");
  }

  return response.json();
}

// New API functions for notifications
export async function getNotifications() {
  const response = await fetch(`${API_BASE_URL}/notifications/`);

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

export async function createNotification(payload: {
  user_email?: string | null;
  title: string;
  message: string;
  type: string;
}) {
  const response = await fetch(`${API_BASE_URL}/notifications/`, {
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
  const response = await fetch(
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

// linear API functions for analytics
export async function getLinearRegressionForecast(patientId: number) {
  const response = await fetch(
    `${API_BASE_URL}/analytics/linear-regression/${patientId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch linear regression forecast");
  }

  return response.json();
}

export async function getSystemSummary() {
  const response = await fetch(`${API_BASE_URL}/analytics/system-summary`);

  if (!response.ok) {
    throw new Error("Failed to fetch system summary");
  }

  return response.json();
}

export async function getAIPatientSummary(patientId: number) {
  const response = await fetch(
    `${API_BASE_URL}/assistant/patient-summary/${patientId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch AI patient summary");
  }

  return response.json();
}

export async function askHealthAI(patientId: number, question: string) {
  const response = await fetch(
    `${API_BASE_URL}/assistant/ask/${patientId}?question=${encodeURIComponent(
      question
    )}`
  );

  if (!response.ok) {
    throw new Error("Failed to ask Health AI");
  }

  return response.json();
}