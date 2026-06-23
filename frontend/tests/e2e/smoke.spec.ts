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
