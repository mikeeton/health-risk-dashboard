const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  throw new Error("Production VITE_API_BASE_URL is required.");
}

if (
  import.meta.env.PROD &&
  import.meta.env.VITE_API_BASE_URL &&
  !configuredApiBaseUrl.startsWith("https://")
) {
  throw new Error("Production VITE_API_BASE_URL must use HTTPS.");
}

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");
export const AUTH_EXPIRED_EVENT = "health-auth-expired";
export const AUTH_TOKEN_REFRESHED_EVENT = "health-auth-token-refreshed";

let refreshRequest: Promise<string | null> | null = null;

export function getWebSocketUrl(path: string) {
  const apiUrl = new URL(API_BASE_URL);
  const [pathname, query = ""] = path.split("?");
  const url = new URL(apiUrl.toString());

  url.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${apiUrl.pathname.replace(/\/+$/, "")}/${pathname.replace(
    /^\/+/,
    ""
  )}`;
  url.search = query ? `?${query}` : "";

  return url.toString();
}

export function getAuthToken() {
  return sessionStorage.getItem("health-auth-token");
}

function clearStoredSession() {
  sessionStorage.removeItem("health-auth-user");
  sessionStorage.removeItem("health-auth-token");
  sessionStorage.removeItem("health-refresh-token");
}

function expireSession() {
  clearStoredSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem("health-refresh-token");
  if (!refreshToken) return null;

  const response = await window.fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
  };
  sessionStorage.setItem("health-auth-token", data.access_token);
  sessionStorage.setItem("health-refresh-token", data.refresh_token);
  window.dispatchEvent(
    new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, {
      detail: { accessToken: data.access_token },
    })
  );
  return data.access_token;
}

async function getRefreshedAccessToken() {
  if (!refreshRequest) {
    refreshRequest = refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  // Centralize Bearer-token attachment so pages/components do not duplicate
  // authentication code or accidentally call protected endpoints anonymously.
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await window.fetch(input, {
    ...init,
    headers,
  });
  if (response.status !== 401 || !token) return response;

  const currentToken = getAuthToken();
  if (currentToken && currentToken !== token) {
    const currentHeaders = new Headers(init.headers);
    currentHeaders.set("Authorization", `Bearer ${currentToken}`);
    return window.fetch(input, { ...init, headers: currentHeaders });
  }

  const refreshedToken = await getRefreshedAccessToken();
  if (refreshedToken) {
    const retryHeaders = new Headers(init.headers);
    retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
    const retryResponse = await window.fetch(input, {
      ...init,
      headers: retryHeaders,
    });
    if (retryResponse.status === 401) expireSession();
    return retryResponse;
  }

  expireSession();
  return response;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function readApiError(response: Response, fallback: string): Promise<ApiError> {
  let detail: unknown;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body) detail = body.detail;
  } catch {
    // A proxy or network gateway may return non-JSON error content.
  }
  const message = typeof detail === "string" && detail.trim()
    ? detail
    : Array.isArray(detail)
      ? detail.map((item) => item && typeof item === "object" && "msg" in item && typeof item.msg === "string" ? item.msg : "").filter(Boolean).join("; ") || fallback
      : fallback;
  return new ApiError(response.status, message);
}

export async function ensureOk(response: Response, fallback: string): Promise<void> {
  if (!response.ok) throw await readApiError(response, fallback);
}
