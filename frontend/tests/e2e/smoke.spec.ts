import { expect, test } from "@playwright/test";

test("login page renders the public access workflow", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show characters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request Doctor, Nurse, or Patient Access" })
  ).toBeVisible();
});

test("password visibility toggle works on login and register", async ({ page }) => {
  await page.goto("/login");
  const loginPassword = page.getByLabel("Password");

  await loginPassword.fill("secret-password");
  await expect(loginPassword).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show characters" }).click();
  await expect(loginPassword).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide characters" }).click();
  await expect(loginPassword).toHaveAttribute("type", "password");

  await page.goto("/register");
  const registerPassword = page.getByPlaceholder("Password");

  await registerPassword.fill("another-secret");
  await expect(registerPassword).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show characters" }).click();
  await expect(registerPassword).toHaveAttribute("type", "text");
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
    sessionStorage.setItem(
      "health-auth-user",
      JSON.stringify({
        id: 1,
        email: "patient@example.com",
        full_name: "Responsive Patient",
        role: "patient",
      })
    );
    sessionStorage.setItem("health-auth-token", "responsive-test-token");
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

test("all four roles receive the correct protected workspace navigation", async ({
  browser,
}) => {
  const roles = [
    {
      role: "doctor",
      path: "/",
      workspace: "Doctor Workspace",
      links: ["Dashboard", "Reports", "Notifications"],
    },
    {
      role: "nurse",
      path: "/",
      workspace: "Nurse Workspace",
      links: ["Dashboard", "Nurse", "Notifications"],
    },
    {
      role: "patient",
      path: "/",
      workspace: "Patient Workspace",
      links: ["Dashboard", "Patient", "Notifications"],
    },
    {
      role: "admin",
      path: "/admin",
      workspace: "Admin Workspace",
      links: ["User Management", "Audit Logs", "Notifications"],
    },
  ];

  for (const definition of roles) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("**/patients", (route) => route.fulfill({ json: [] }));
    await page.route("**/notifications/**", (route) =>
      route.fulfill({ json: [] })
    );
    await page.addInitScript((role) => {
      sessionStorage.setItem(
        "health-auth-user",
        JSON.stringify({
          id: 901,
          email: `${role}@example.com`,
          full_name: `Test ${role}`,
          role,
        })
      );
      sessionStorage.setItem("health-auth-token", `${role}-test-token`);
    }, definition.role);

    await page.goto(definition.path);
    await expect(
      page.getByText(definition.workspace, { exact: true })
    ).toBeVisible();
    for (const link of definition.links) {
      await expect(page.getByRole("link", { name: link })).toBeVisible();
    }
    await context.close();
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
