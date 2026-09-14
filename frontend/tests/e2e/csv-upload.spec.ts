import { expect, test } from "@playwright/test";


function csvWithRows(count: number) {
  const header = [
    "timestamp",
    "heartRate",
    "spo2",
    "systolicBP",
    "diastolicBP",
    "steps",
    "sleepHours",
    "activeMinutes",
    "calories",
    "activityState",
  ].join(",");
  const rows = Array.from({ length: count }, (_, index) =>
    [
      `2026-09-11T${String(index).padStart(2, "0")}:00:00Z`,
      70 + (index % 5),
      97,
      120,
      80,
      1000 + index,
      7,
      30,
      1800,
      "resting",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}


async function prepareUploadPage(page: import("@playwright/test").Page) {
  const uploadedPayloads: Array<Record<string, unknown>> = [];
  await page.route("http://127.0.0.1:8000/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/patients") {
      await route.fulfill({
        json: [
          {
            id: 77,
            name: "CSV Test Patient",
            age: 52,
            condition: "General Monitoring",
            risk_level: "Low",
            last_checkup: "2026-09-01",
          },
        ],
      });
      return;
    }
    if (path === "/vitals" && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      uploadedPayloads.push(payload);
      await route.fulfill({
        json: {
          id: uploadedPayloads.length,
          ...payload,
          verification_status: "unverified",
        },
      });
      return;
    }
    if (path.startsWith("/vitals/") || path.startsWith("/notifications")) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ json: [] });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "health-auth-user",
      JSON.stringify({
        id: 10,
        email: "csv.doctor@example.com",
        full_name: "CSV Doctor",
        role: "doctor",
      })
    );
    sessionStorage.setItem("health-auth-token", "csv-upload-test-token");
  });
  await page.goto("/upload");
  await expect(
    page.getByRole("heading", { name: "Upload Health Dataset", exact: true })
  ).toBeVisible();
  return uploadedPayloads;
}


for (const rowCount of [3, 5, 20]) {
  test(`${rowCount}-row CSV previews at most five rows and uploads all rows`, async ({
    page,
  }) => {
    const uploadedPayloads = await prepareUploadPage(page);
    await page.getByLabel("Choose vitals CSV file").setInputFiles({
      name: `vitals-${rowCount}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(csvWithRows(rowCount)),
    });

    const expectedPreviewCount = Math.min(rowCount, 5);
    await expect(
      page.getByText(
        `${rowCount} parsed rows; previewing ${expectedPreviewCount}.`
      )
    ).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(
      expectedPreviewCount
    );

    const successDialog = page.waitForEvent("dialog");
    await page.getByRole("button", { name: "Upload Dataset" }).click();
    const dialog = await successDialog;
    expect(dialog.message()).toContain("dataset uploaded successfully");
    await dialog.accept();

    await expect.poll(() => uploadedPayloads.length).toBe(rowCount);
    expect(uploadedPayloads.every((payload) => payload.source === "csv_upload")).toBe(
      true
    );
  });
}
