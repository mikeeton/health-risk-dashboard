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
