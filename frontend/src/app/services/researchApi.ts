import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";

export async function getResearchSummary() {
  const response = await apiFetch(`${API_BASE_URL}/research/summary`);
  await ensureOk(response, "Failed to load research summary");
  return response.json();
}

export async function getGlobalShap() {
  const response = await apiFetch(`${API_BASE_URL}/research/global-shap`);
  await ensureOk(response, "Failed to load global SHAP evidence");
  return response.json();
}

export async function getPendingProspectivePredictions() {
  const response = await apiFetch(`${API_BASE_URL}/research/prospective/pending`);
  await ensureOk(response, "Failed to load prospective predictions");
  return response.json();
}

async function postResearch(path: string, payload: Record<string, unknown>) {
  const response = await apiFetch(`${API_BASE_URL}/research/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  await ensureOk(response, "Research evidence could not be saved");
  return response.json();
}

export const saveUsabilitySession = (payload: Record<string, unknown>) => postResearch("usability-sessions", payload);
export const saveProspectiveOutcome = (payload: Record<string, unknown>) => postResearch("prospective/outcomes", payload);
export const saveEffectivenessRecord = (payload: Record<string, unknown>) => postResearch("effectiveness-records", payload);

export async function downloadResearchEvidence() {
  const response = await apiFetch(`${API_BASE_URL}/research/evidence-export`);
  await ensureOk(response, "Failed to export research evidence");
  const blob = new Blob([JSON.stringify(await response.json(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = `research-evidence-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
}
