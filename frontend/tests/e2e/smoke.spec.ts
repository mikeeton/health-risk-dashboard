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

  await expect(page.getByText("Login failed")).toBeVisible({ timeout: 15_000 });
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
      links: ["Dashboard", "Care Workspace", "Reports", "Notifications", "Profile & Security"],
    },
    {
      role: "nurse",
      path: "/",
      workspace: "Nurse Workspace",
      links: ["Dashboard", "Care Workspace", "Nurse", "Notifications", "Profile & Security"],
    },
    {
      role: "patient",
      path: "/",
      workspace: "Patient Workspace",
      links: ["Dashboard", "My Care", "Patient", "AI Assistant", "Notifications", "Profile & Security"],
    },
    {
      role: "admin",
      path: "/admin",
      workspace: "Admin Workspace",
      links: ["User Management", "Operations", "Audit Logs", "Notifications", "Profile & Security"],
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
      await expect(
        page.getByRole("link", { name: link, exact: true })
      ).toBeVisible();
    }
    await context.close();
  }
});

test("admin navigation highlights exactly one current section", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/**", (route) =>
    route.fulfill({ json: [] })
  );
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "health-auth-user",
      JSON.stringify({
        id: 1,
        email: "admin@example.com",
        full_name: "System Admin",
        role: "admin",
      })
    );
    sessionStorage.setItem("health-auth-token", "admin-navigation-token");
  });

  const sections = [
    ["/admin", "Admin"],
    ["/admin/users", "User Management"],
    ["/admin/approvals", "Approvals"],
  ] as const;

  for (const [path, label] of sections) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveClass(
      /nav-item-active/
    );
    await expect(page.locator("nav .nav-item-active")).toHaveCount(1);
  }
});

test("assigned clinicians can switch patients and the selection persists", async ({
  page,
}) => {
  const assignedPatients = [
    {
      id: 71,
      name: "Assigned Alpha",
      age: 50,
      condition: "Hypertension",
      risk_level: "Medium",
      last_checkup: "2026-07-20",
    },
    {
      id: 72,
      name: "Assigned Beta",
      age: 64,
      condition: "COPD",
      risk_level: "High",
      last_checkup: "2026-07-21",
    },
  ];
  await page.route("**/patients", (route) => route.fulfill({ json: assignedPatients }));
  await page.route("**/patients/", (route) => route.fulfill({ json: assignedPatients }));
  await page.route("**/vitals/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/medications/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/notifications/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/care/**", (route) => route.fulfill({ json: [] }));
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "health-auth-user",
      JSON.stringify({
        id: 44,
        email: "assigned.doctor@example.com",
        full_name: "Assigned Doctor",
        role: "doctor",
      })
    );
    sessionStorage.setItem("health-auth-token", "assigned-doctor-token");
  });

  await page.goto("/care");
  const switcher = page.getByLabel("Switch assigned patient");
  await expect(switcher).toHaveValue("71");
  await switcher.selectOption("72");
  await expect(switcher).toHaveValue("72");
  await page.reload();
  await expect(page.getByLabel("Switch assigned patient")).toHaveValue("72");
});

test("an expired session refreshes once and redirects cleanly when renewal fails", async ({
  page,
}) => {
  let refreshCalls = 0;
  await page.route("**/auth/refresh", async (route) => {
    refreshCalls += 1;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Invalid refresh token" }),
    });
  });
  await page.route("**/patients*", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Authentication required" }),
    })
  );
  await page.route("**/notifications/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Authentication required" }),
    })
  );
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "health-auth-user",
      JSON.stringify({
        id: 1,
        email: "doctor@example.com",
        full_name: "Expired Doctor",
        role: "doctor",
      })
    );
    sessionStorage.setItem("health-auth-token", "expired-access-token");
    sessionStorage.setItem("health-refresh-token", "expired-refresh-token");
  });

  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  expect(refreshCalls).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        user: sessionStorage.getItem("health-auth-user"),
        access: sessionStorage.getItem("health-auth-token"),
        refresh: sessionStorage.getItem("health-refresh-token"),
      }))
    )
    .toEqual({ user: null, access: null, refresh: null });
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
    process.env.E2E_ADMIN_PASSWORD ?? "Password123"
  );
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText("Login successful")).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText("Admin Workspace")).toBeVisible();
  await expect(page.getByRole("link", { name: /User Management/ })).toBeVisible();
});

test("notification bell moves read items into persistent history", async ({ page }) => {
  const notification = {
    id: 901,
    user_email: "notification.doctor@example.com",
    target_role: null,
    title: "New patient observation",
    message: "A new oxygen saturation reading is ready for review.",
    type: "alert",
    is_read: "false",
    link: "/care",
    related_entity: "Vital",
    related_entity_id: "44",
    created_at: new Date().toISOString(),
    read_at: null,
  };
  let isRead = false;

  await page.route("**/notifications/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "PATCH") {
      isRead = true;
      await route.fulfill({ json: { ...notification, is_read: "true" } });
      return;
    }
    const status = url.searchParams.get("status");
    const visible = status === "read" ? isRead : !isRead;
    await route.fulfill({ json: visible ? [{ ...notification, is_read: isRead ? "true" : "false" }] : [] });
  });
  await page.route("**/patients*", (route) => route.fulfill({ json: [] }));
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "health-auth-user",
      JSON.stringify({
        id: 90,
        email: "notification.doctor@example.com",
        full_name: "Notification Doctor",
        role: "doctor",
      })
    );
    sessionStorage.setItem("health-auth-token", "notification-test-token");
  });

  await page.goto("/notifications");
  await page.getByRole("button", { name: /Notifications, 1 unread/ }).click();
  await expect(page.getByRole("dialog", { name: "Unread notifications" })).toContainText(
    "New patient observation"
  );
  await page.getByRole("button", { name: "Mark read", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Unread notifications" })).toContainText(
    "all caught up"
  );
  await page.getByRole("button", { name: "Open notification history" }).click();
  await page.getByRole("tab", { name: /Read history/ }).click();
  await expect(page.getByText("New patient observation")).toBeVisible();
});
