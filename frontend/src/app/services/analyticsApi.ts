import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";

export async function getMLPrediction(patientId: number) {
  const response = await apiFetch(`${API_BASE_URL}/ml/predict/${patientId}`);

  await ensureOk(response, "Failed to fetch ML prediction");

  return response.json();
}

export async function getLinearRegressionForecast(patientId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/analytics/linear-regression/${patientId}`
  );

  await ensureOk(response, "Failed to fetch linear regression forecast");

  return response.json();
}

export async function getSystemSummary() {
  const response = await apiFetch(`${API_BASE_URL}/analytics/system-summary`);

  await ensureOk(response, "Failed to fetch system summary");

  return response.json();
}

export type ModelEvaluation = {
  available: boolean;
  reason?: string;
  model_version?: string;
  created_at?: string;
  dataset?: { name: string; source_url: string; sha256: string };
  outcome_definition?: string;
  selected_model?: string;
  operating_threshold?: number;
  approved_for_inference?: boolean;
  records?: { total: number; train: number; selection?: number; calibration?: number; threshold?: number; validation?: number; test: number };
  preparation?: { label_mode?: string; outcome_policy?: string };
  test_confidence_intervals?: { method: string; patients: number; metrics: Record<string, { lower: number; upper: number; valid_iterations: number } | null> };
  test_metrics?: Record<string, number | null | object>;
  candidate_validation?: Record<string, { roc_auc?: number; pr_auc?: number; precision?: number; recall_sensitivity?: number }>;
  fairness?: Record<string, unknown>;
  external_validation?: Record<string, unknown> | null;
  acceptance_gates?: Record<string, boolean>;
  limitations?: string[];
};

export async function getModelEvaluation(): Promise<ModelEvaluation> {
  const response = await apiFetch(`${API_BASE_URL}/ml/evaluation`);
  await ensureOk(response, "Failed to fetch model evaluation");
  return response.json();
}

export async function getResearchCandidateEvaluation(): Promise<ModelEvaluation> {
  const response = await apiFetch(`${API_BASE_URL}/ml/research-candidate`);
  await ensureOk(response, "Failed to fetch research candidate");
  return response.json();
}

export async function getUsabilityProtocol() {
  const response = await apiFetch(`${API_BASE_URL}/ml/usability-protocol`);
  await ensureOk(response, "Failed to fetch usability protocol");
  return response.json() as Promise<Record<string, unknown>>;
}
