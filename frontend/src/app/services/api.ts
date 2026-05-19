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