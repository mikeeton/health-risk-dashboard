import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";

export async function getRegistrationRequests() {
  const response = await apiFetch(`${API_BASE_URL}/registration-requests/`);

  await ensureOk(response, "Failed to fetch registration requests");

  return response.json();
}

export async function approveRegistrationRequest(requestId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/registration-requests/${requestId}/approve`,
    {
      method: "POST",
    }
  );

  await ensureOk(response, "Failed to approve request");

  return response.json();
}

export async function rejectRegistrationRequest(requestId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/registration-requests/${requestId}/reject`,
    {
      method: "POST",
    }
  );

  await ensureOk(response, "Failed to reject request");

  return response.json();
}

// doctor clinician API functions for role-based actions

export async function getAdminUsers() {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/`);

  await ensureOk(response, "Failed to fetch users");
  return response.json();
}

export async function suspendAdminUser(userId: number) {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}/suspend`, {
    method: "PATCH",
  });

  await ensureOk(response, "Failed to suspend user");
  return response.json();
}

export async function activateAdminUser(userId: number) {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}/activate`, {
    method: "PATCH",
  });

  await ensureOk(response, "Failed to activate user");
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

  await ensureOk(response, "Failed to reset password");
  return response.json();
}

export async function createAdminPasswordResetLink(userId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/users/${userId}/password-reset-link`,
    { method: "POST" }
  );
  await ensureOk(response, "Failed to create password reset link");
  return response.json() as Promise<{ reset_url: string; expires_at: string; delivery: string }>;
}

export async function getAdminAssignmentPatients() {
  const response = await apiFetch(`${API_BASE_URL}/admin/assignments/patients`);

  await ensureOk(response, "Failed to fetch assignment patients");
  return response.json();
}

export async function getAdminAssignmentStaff() {
  const response = await apiFetch(`${API_BASE_URL}/admin/assignments/staff`);

  await ensureOk(response, "Failed to fetch assignment staff");
  return response.json();
}

export async function getAdminAssignments() {
  const response = await apiFetch(`${API_BASE_URL}/admin/assignments/`);

  await ensureOk(response, "Failed to fetch staff assignments");
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

  await ensureOk(response, "Failed to create staff assignment");
  return response.json();
}

export async function removeAdminAssignment(assignmentId: number) {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/assignments/${assignmentId}`,
    {
      method: "DELETE",
    }
  );

  await ensureOk(response, "Failed to remove staff assignment");
  return response.json();
}
