import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";

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

  await ensureOk(response, "Failed to fetch referral staff");
  return response.json();
}

export async function getReferrals(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiFetch(`${API_BASE_URL}/referrals/${query}`);

  await ensureOk(response, "Failed to fetch referrals");
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

  await ensureOk(response, "Failed to create referral");
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

  await ensureOk(response, "Failed to approve referral");
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

  await ensureOk(response, "Failed to reject referral");
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

  await ensureOk(response, "Failed to request more information");
  return response.json();
}
