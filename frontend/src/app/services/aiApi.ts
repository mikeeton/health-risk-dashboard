import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";

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

  await ensureOk(response, "Failed to fetch AI patient summary");

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

  await ensureOk(response, "Failed to ask Health AI");

  return response.json();
}

export async function clearAIMemory(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/assistant/memory/${patientId}`,
    { method: "DELETE" }
  );
  await ensureOk(response, "Failed to clear AI memory");
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
  await ensureOk(response, "Failed to submit AI feedback");
  return response.json();
}

export async function getAIConfiguration() {
  const response = await apiFetch(`${API_BASE_URL}/assistant/configuration`);
  await ensureOk(response, "Failed to fetch AI configuration");
  return response.json();
}
