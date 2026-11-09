import { API_BASE_URL, apiFetch, ensureOk } from "./httpClient";
import type { LoginRequest, TokenResponse } from "../types/api";

export async function loginUser(credentials: LoginRequest): Promise<TokenResponse> {
  const response = await window.fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Mode": "cookie",
    },
    body: JSON.stringify(credentials),
  });

  await ensureOk(response, "Invalid email or password");

  return response.json() as Promise<TokenResponse>;
}

export async function logoutUser(csrfToken: string | null) {
  if (!csrfToken) return;
  await window.fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Auth-Mode": "cookie", "X-CSRF-Token": csrfToken },
  });
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

  await ensureOk(response, "Failed to submit registration request");

  return response.json();
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const response = await window.fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  await ensureOk(response, "Password reset failed");
}
