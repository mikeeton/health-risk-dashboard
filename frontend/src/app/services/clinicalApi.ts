import { API_BASE_URL, apiFetch, ensureOk, readApiError } from "./httpClient";
import type {
  PatientCreateRequest,
  PatientRecord,
  ReviewCaseCreateRequest,
  ReviewCaseRecord,
  ReviewCaseUpdateRequest,
  VitalCreateRequest,
  VitalRecord,
} from "../types/api";

export async function getPatients(): Promise<PatientRecord[]> {
  const response = await apiFetch(`${API_BASE_URL}/patients`);

  await ensureOk(response, "Failed to fetch patients");

  return response.json() as Promise<PatientRecord[]>;
}

export async function createPatient(patient: PatientCreateRequest): Promise<PatientRecord> {
  const response = await apiFetch(`${API_BASE_URL}/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patient),
  });

  await ensureOk(response, "Failed to create patient");

  return response.json() as Promise<PatientRecord>;
}

export async function deletePatient(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/patients/${patientId}`, {
    method: "DELETE",
  });

  await ensureOk(response, "Failed to delete patient");

  return response.json();
}

export async function getVitals(patientId: number): Promise<VitalRecord[]> {
  const response = await apiFetch(`${API_BASE_URL}/vitals/${patientId}`);

  await ensureOk(response, "Failed to fetch vitals");

  return response.json() as Promise<VitalRecord[]>;
}

export class VitalSaveError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function createVital(vital: VitalCreateRequest): Promise<VitalRecord> {
  const response = await apiFetch(`${API_BASE_URL}/vitals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(vital),
  });

  if (!response.ok) {
    const error = await readApiError(response, "Failed to save reading");
    throw new VitalSaveError(error.status, error.message);
  }

  return response.json() as Promise<VitalRecord>;
}

export async function deleteVital(vitalId: string | number) {
  const response = await apiFetch(`${API_BASE_URL}/vitals/${vitalId}`, {
    method: "DELETE",
  });

  await ensureOk(response, "Failed to delete vital");

  return response.json();
}

export async function createReviewCase(review: ReviewCaseCreateRequest): Promise<ReviewCaseRecord> {
  const response = await apiFetch(`${API_BASE_URL}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(review),
  });

  await ensureOk(response, "Failed to create review case");

  return response.json() as Promise<ReviewCaseRecord>;
}

export async function getReviewCases(): Promise<ReviewCaseRecord[]> {
  const response = await apiFetch(`${API_BASE_URL}/reviews`);

  await ensureOk(response, "Failed to fetch review cases");

  return response.json() as Promise<ReviewCaseRecord[]>;
}

export async function updateReviewCase(
  caseId: number,
  update: ReviewCaseUpdateRequest
): Promise<ReviewCaseRecord> {
  const response = await apiFetch(`${API_BASE_URL}/reviews/${caseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(update),
  });

  await ensureOk(response, "Failed to update review case");

  return response.json() as Promise<ReviewCaseRecord>;
}

export async function getAuditLogs() {
  const response = await apiFetch(`${API_BASE_URL}/audit/`);

  await ensureOk(response, "Failed to fetch audit logs");

  return response.json();
}

export async function getMedications(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/medications/${patientId}`);

  await ensureOk(response, "Failed to fetch medications");

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

  await ensureOk(response, "Failed to create medication");

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

  await ensureOk(response, "Failed to update medication");

  return response.json();
}

export async function getPatientEvents(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/events/${patientId}`);

  await ensureOk(response, "Failed to fetch patient events");

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

  await ensureOk(response, "Failed to create patient event");

  return response.json();
}

export async function generateLiveSimulatorVital(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/live-simulator/generate/${patientId}`,
    {
      method: "POST",
    }
  );

  await ensureOk(response, "Failed to generate live simulator vital");

  return response.json();
}

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

  await ensureOk(response, "Failed to add clinical note");
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

  await ensureOk(response, "Failed to escalate patient");
  return response.json();
}

export async function getDoctorPatientHistory(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/role-actions/doctor/patient-history/${patientId}`
  );

  await ensureOk(response, "Failed to fetch history");
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

  await ensureOk(response, "Failed to record vitals");
  return response.json();
}

export async function nurseMarkMedicationGiven(medicationId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/role-actions/nurse/mark-medication-given/${medicationId}`,
    { method: "POST" }
  );

  await ensureOk(response, "Failed to mark medication");
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

  await ensureOk(response, "Failed to add nursing note");
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

  await ensureOk(response, "Failed to raise alert");
  return response.json();
}

export async function getPatientOwnRecords(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/role-actions/patient/my-records/${patientId}`
  );

  await ensureOk(response, "Failed to fetch patient records");
  return response.json();
}
