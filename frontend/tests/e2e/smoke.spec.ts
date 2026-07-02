import { expect, test } from "@playwright/test";

test("login page renders the public access workflow", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request Doctor, Nurse, or Patient Access" })
  ).toBeVisible();
});

test("invalid login shows a useful error message", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("unknown@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText("Login failed")).toBeVisible();
  await expect(
    page.getByText("Check your email, password, and backend server.")
  ).toBeVisible();
});

test("core pages avoid horizontal overflow on common device widths", async ({ page }) => {
  const sizes = [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ];

  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();

    let hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Request Access" })).toBeVisible();

    hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});

test("authenticated app shell fits phone and tablet widths", async ({ page }) => {
  await page.route("**/patients", async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route("**/vitals/**", async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route("**/notifications/**", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.addInitScript(() => {
    localStorage.setItem(
      "health-auth-user",
      JSON.stringify({
        id: 1,
        email: "patient@example.com",
        full_name: "Responsive Patient",
        role: "patient",
      })
    );
    localStorage.setItem("health-auth-token", "responsive-test-token");
  });

  for (const size of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(page.getByText("Patient Workspace")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});

test("admin can reach protected admin workspace", async ({ page }) => {
  test.skip(
    process.env.E2E_RUN_AUTH !== "1",
    "Set E2E_RUN_AUTH=1 with a running backend and seeded admin account."
  );

  await page.goto("/login");

  await page.getByLabel("Email").fill(
    process.env.E2E_ADMIN_EMAIL ?? "admin@example.com"
  );
  await page.getByLabel("Password").fill(
    process.env.E2E_ADMIN_PASSWORD ?? "AdminPassword123!"
  );
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText("Login successful")).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText("Admin Workspace")).toBeVisible();
  await expect(page.getByRole("link", { name: /User Management/ })).toBeVisible();
});
