import { expect, test } from "@playwright/test";

test("API errors preserve status and format validation details safely", async ({ page }) => {
  await page.goto("/login");
  const result = await page.evaluate(async () => {
    const { readApiError } = await import("/src/app/services/httpClient.ts");
    const validation = await readApiError(new Response(
      JSON.stringify({ detail: [{ msg: "Patient is required" }, { msg: "Invalid date" }] }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    ), "Request failed");
    const gateway = await readApiError(new Response("Unavailable", { status: 503 }), "Service unavailable");
    return { validation: { status: validation.status, message: validation.message }, gateway: { status: gateway.status, message: gateway.message } };
  });
  expect(result).toEqual({
    validation: { status: 422, message: "Patient is required; Invalid date" },
    gateway: { status: 503, message: "Service unavailable" },
  });
});

test("concurrent expired requests share one token refresh", async ({ page }) => {
  await page.goto("/login");
  const result = await page.evaluate(async () => {
    const { apiFetch } = await import("/src/app/services/httpClient.ts");
    sessionStorage.setItem("health-auth-token", "old-access");
    sessionStorage.setItem("health-refresh-token", "old-refresh");
    const originalFetch = window.fetch;
    let refreshes = 0;
    const retried: string[] = [];
    window.fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshes += 1;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return new Response(JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh" }), { status: 200 });
      }
      const bearer = new Headers(init?.headers).get("Authorization");
      if (bearer === "Bearer old-access") return new Response(null, { status: 401 });
      retried.push(`${url}:${bearer}`);
      return new Response(null, { status: 200 });
    };
    try {
      const responses = await Promise.all([apiFetch("/probe-a"), apiFetch("/probe-b")]);
      return { refreshes, statuses: responses.map((response) => response.status), retried: retried.sort() };
    } finally {
      window.fetch = originalFetch;
      sessionStorage.clear();
    }
  });
  expect(result).toEqual({
    refreshes: 1,
    statuses: [200, 200],
    retried: ["/probe-a:Bearer new-access", "/probe-b:Bearer new-access"],
  });
});
