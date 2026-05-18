const API_BASE_URL =
  "http://127.0.0.1:8000";

export async function getPatients() {
  const response = await fetch(
    `${API_BASE_URL}/patients`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch patients"
    );
  }

  return response.json();
}

export async function createPatient(
  patient: unknown
) {
  const response = await fetch(
    `${API_BASE_URL}/patients`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(patient),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to create patient"
    );
  }

  return response.json();
}

export async function getVitals(
  patientId: number
) {
  const response = await fetch(
    `${API_BASE_URL}/vitals/${patientId}`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch vitals"
    );
  }

  return response.json();
}

export async function createVital(
  vital: unknown
) {
  const response = await fetch(
    `${API_BASE_URL}/vitals`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(vital),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to create vital"
    );
  }

  return response.json();
}