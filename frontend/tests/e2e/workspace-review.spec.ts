import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const evidence = join(process.cwd(), "..", "docs", "evidence", process.env.REVIEW_EVIDENCE_DIR ?? "workspace-review-2026-10-19");
const modelEvaluation = { ...JSON.parse(readFileSync(join(process.cwd(), "..", "backend", "artifacts", "ml", "evaluation.json"), "utf8")), available: true, preparation: { label_mode: "legacy_forward_fill" }, research_only: true, clinical_approval: false };
const candidatePath = join(process.cwd(), "..", "backend", "artifacts", "ml-observed-v1", "evaluation.json");
const candidateEvaluation = existsSync(candidatePath) ? { ...JSON.parse(readFileSync(candidatePath, "utf8")), available: true, serving_inference: false } : { available: false };
const patient = { id: 1, name: "Alex Morgan", age: 61, condition: "Hypertension", risk_level: "High", last_checkup: "2026-10-15" };
const vital = (id: number, day: string, source: string, heartRate: number) => ({
  id, patient_id: 1, timestamp: `${day}T09:00:00Z`, heart_rate: heartRate, spo2: 96,
  systolic_bp: 138, diastolic_bp: 84, steps: 4200, sleep_hours: 7,
  active_minutes: 28, calories: 1800, risk_score: 6,
  activity_state: "resting", source, verification_status: "received",
});
const vitals = [vital(1, "2026-10-15", "manual", 78), vital(2, "2026-10-17", "withings", 82), vital(3, "2026-10-19", "withings", 80)];
const aiResponse = {
  response_id: "fixture-response-1", generated_at: "2026-10-19T09:30:00Z",
  model_used: "deterministic fallback", prompt_version: "fixture-v1",
  data_freshness: { is_stale: false, age_hours: 1 }, provider_status: "fallback",
  requires_human_review: true, summary: "Review recent recorded blood pressure with the care team.",
  answer: "Review recent recorded blood pressure with the care team.",
  output: { confidence: 0.65, risk_level: "High", summary: "Recent observations should be reviewed by the care team.",
    supporting_evidence: [{ source_id: "vital:3", timestamp: "2026-10-19T09:00:00Z", observation: "Recorded blood pressure 138/84 mmHg", relevance: "Most recent measurement" }],
    missing_information: ["No symptom report was supplied."], recommended_checks: ["Confirm the latest blood pressure."],
    escalation_conditions: ["Escalate new urgent symptoms."], safety_warning: "Human review is required." },
};

async function setup(page: Page, role: "doctor" | "nurse" | "patient" | "admin", theme: "light" | "dark") {
  await page.addInitScript(({ role, theme }) => {
    sessionStorage.setItem("health-auth-user", JSON.stringify({ id: 901, email: `${role}@example.test`, full_name: `Fixture ${role}`, role }));
    sessionStorage.setItem("health-auth-token", "fixture-token");
    localStorage.setItem("health-risk-dashboard-theme", theme);
  }, { role, theme });
  await page.routeWebSocket("**/notifications/ws?*", () => {});
  await page.route("http://127.0.0.1:8000/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/auth/websocket-ticket") return route.fulfill({ json: { ticket: "fixture-ticket", expires_in_seconds: 60 } });
    if (path === "/patients") return route.fulfill({ json: role === "admin" ? [] : [patient] });
    if (path === "/vitals/1") return route.fulfill({ json: vitals });
    if (path === "/integrations/withings/status/1") return route.fulfill({ json: { configured: true, connected: true, data_stale: false, sync_state: "healthy", last_sync_at: "2026-10-19T09:05:00Z", last_successful_sync: "2026-10-19T09:05:00Z" } });
    if (path === "/integrations/withings/observations/1") return route.fulfill({ json: [{ id: 31, source: "withings", measured_at: "2026-10-19T09:05:00Z", received_at: "2026-10-19T09:06:00Z", measurements: { heart_rate: 78 }, missing_fields: ["spo2", "systolic_bp", "diastolic_bp"], assessment_state: "observed_fields_clear" }] });
    if (path === "/integrations/withings/sync-history/1") return route.fulfill({ json: [{ id: 4, provider: "withings", attempted_at: "2026-10-19T09:05:00Z", completed_at: "2026-10-19T09:06:00Z", state: "success", accepted_complete: 0, accepted_partial: 1, rejected: 1, error_code: null, error_message: null }] });
    if (path === "/ml/research-candidate") return route.fulfill({ json: candidateEvaluation });
    if (path === "/research/summary") return route.fulfill({ json: { model: { available: true, test_metrics: {} }, prediction_classifications: {}, usability_sessions: 0, prospective_outcomes: 0, effectiveness_records: 0 } });
    if (path === "/research/global-shap") return route.fulfill({ json: { model_version: "synthetic-test", prediction_records: 2, shap_prediction_records: 0, excluded_non_shap_records: 2, excluded_other_version_records: 0, method: "SHAP unavailable in stored predictions", features: [] } });
    if (path === "/research/prospective/pending") return route.fulfill({ json: [{ prediction_id: 4, window_end: "2020-10-19T06:00:00Z", window_expired: true, model_version: "synthetic-test" }, { prediction_id: 5, window_end: "2099-10-19T06:00:00Z", window_expired: false, model_version: "synthetic-test" }] });
    if (path === "/care/tasks/1") return route.fulfill({ json: [{ id: 1, title: "Review morning observation", status: "open", priority: "high", due_at: "2026-10-19T10:00:00Z" }] });
    if (path === "/care/observation-schedules/1") return route.fulfill({ json: [{ id: 1, metric: "blood_pressure", next_due_at: "2026-10-19T10:00:00Z", active: true }] });
    if (path === "/care/medication-administrations/1") return route.fulfill({ json: [{ id: 1, status: "given", scheduled_at: "2026-10-19T08:00:00Z" }] });
    if (path === "/care/admin/operations") return route.fulfill({ json: { services: { api: "ok", database: "ok" }, governance: { audit_logging: true }, counts: { active_users: 12, open_incidents: 1, open_data_requests: 0, ai_feedback: 3 }, backup: { status: "verified" } } });
    if (path === "/care/admin/preemptive-monitoring") return route.fulfill({ json: { enabled: false, interval_minutes: 5 } });
    if (path === "/care/admin/model-governance") return route.fulfill({ json: { enabled: true, mode: "shadow", threshold: null, false_negative_cost: 8, false_positive_cost: 1, require_consecutive: 2, require_trend_confirmation: true, drift_threshold: 3, auto_suspend: true, active_model_version: "physionet-critical-v1", retirement_reason: null } });
    if (path === "/care/admin/model-quality") return route.fulfill({ json: { predictions: 0, alerts_per_100_patients: 0, duplicate_alerts_suppressed: 0, false_positive_reviews: 0, false_negatives: 0 } });
    if (path === "/care/account/profile") return route.fulfill({ json: { id: 901, full_name: `Fixture ${role}`, role, email: `${role}@example.test`, mfa_enabled: false } });
    if (path === "/care/account/sessions") return route.fulfill({ json: [{ id: 17, created_at: "2026-10-19T09:00:00Z", expires_at: "2026-10-26T09:00:00Z", revoked_at: null }] });
    if (path === "/reviews") return route.fulfill({ json: [{ id: 1, patient_id: 1, patient_name: "Alex Morgan", risk_level: "High", risk_score: 6, status: "Open", note: "Review observation" }] });
    if (path === "/ml/predict/1") return route.fulfill({ json: { prediction_score: 6, prediction_level: "High", source: "fixture", message: "Research prediction; confirm with the clinical record." } });
    if (path === "/ml/evaluation") return route.fulfill({ json: modelEvaluation });
    if (path === "/assistant/configuration") return route.fulfill({ json: { enabled: false, governance_ready: false } });
    if (path === "/assistant/patient-summary/1" || path === "/assistant/ask/1") return route.fulfill({ json: aiResponse });
    if (path === "/notifications/") return route.fulfill({ json: [
      { id: 1, title: "Observation needs review", message: "Check the linked clinical case.", type: "alert", is_read: "false", created_at: "2026-10-19T09:00:00Z", link: "/review-cases" },
      { id: 2, title: "System update", message: "The service is available.", type: "system", is_read: "false", created_at: "2026-10-19T08:00:00Z" },
    ] });
    return route.fulfill({ json: [] });
  });
}

const views = [
  { role: "doctor", path: "/doctor", heading: "Clinical command centre" },
  { role: "doctor", path: "/analytics", heading: "Research model evidence" },
  { role: "nurse", path: "/nurse", heading: "Nursing worklist" },
  { role: "patient", path: "/patient", heading: "My health record" },
  { role: "admin", path: "/admin", heading: "Administration" },
  { role: "admin", path: "/admin/research", heading: "Research evidence workspace" },
  { role: "patient", path: "/devices", heading: "Devices and measurements" },
  { role: "doctor", path: "/notifications", heading: "Events and notifications" },
  { role: "doctor", path: "/ai-assistant", heading: "AI-assisted review" },
] as const;

test("secondary routes stay accessible and usable across themes and widths", async ({ browser }) => {
  test.setTimeout(180_000);
  const secondaryRoutes = [
    { role: "doctor", path: "/reports" },
    { role: "doctor", path: "/referrals" },
    { role: "doctor", path: "/review-cases" },
    { role: "doctor", path: "/care" },
    { role: "nurse", path: "/upload" },
    { role: "admin", path: "/admin/users" },
    { role: "admin", path: "/admin/approvals" },
    { role: "admin", path: "/admin/assignments" },
    { role: "admin", path: "/audit-logs" },
  ] as const;
  for (const view of secondaryRoutes) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await setup(page, view.role, "light");
    await page.goto(view.path);
    await expect(page.locator("main")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), { message: view.path }).toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => localStorage.setItem("health-risk-dashboard-theme", "dark"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ["critical", "serious"].includes(item.impact ?? "")).map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target.join(" ")) })), view.path).toEqual([]);
    await context.close();
  }
});

test("secondary operations and security pages keep readable fields in both themes", async ({ browser }) => {
  test.setTimeout(90_000);
  const secondary = [
    { role: "admin", path: "/admin/operations", heading: "Operations & governance", field: "organisation_unit_name" },
    { role: "patient", path: "/account", heading: "Profile & security", field: "profile_full_name" },
  ] as const;
  if (process.env.CAPTURE_REVIEW_SCREENSHOTS === "1") await mkdir(evidence, { recursive: true });
  for (const view of secondary) {
    for (const theme of ["light", "dark"] as const) {
      for (const size of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
        const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, reducedMotion: "reduce" });
        const page = await context.newPage();
        await setup(page, view.role, theme);
        await page.goto(view.path);
        await expect(page.getByRole("heading", { name: view.heading })).toBeVisible();
        const field = page.locator(`input[name="${view.field}"]`);
        await expect(field).toBeVisible();
        const background = await field.evaluate((element) => {
          const channels = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
          return channels.reduce((sum, channel) => sum + channel, 0) / channels.length;
        });
        if (theme === "light") expect(background, `${view.path} light field surface`).toBeGreaterThan(200);
        else expect(background, `${view.path} dark field surface`).toBeLessThan(80);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        if (size.name === "desktop") {
          const results = await new AxeBuilder({ page }).analyze();
          expect(results.violations.filter((item) => ["critical", "serious"].includes(item.impact ?? "")).map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target.join(" ")) })), `${view.path} ${theme}`).toEqual([]);
        }
        if (process.env.CAPTURE_REVIEW_SCREENSHOTS === "1" && (theme === "light" && size.name === "desktop" || theme === "dark" && size.name === "mobile")) {
          await page.screenshot({ path: join(evidence, `${view.path.slice(1).replaceAll("/", "-")}-${theme}-${size.name}.png`), fullPage: true });
        }
        await context.close();
      }
    }
  }
});

test("purpose-built workspaces render across roles, themes and viewports", async ({ browser }) => {
  test.setTimeout(180_000);
  if (process.env.CAPTURE_REVIEW_SCREENSHOTS === "1") await mkdir(evidence, { recursive: true });
  for (const view of views.filter((item) => !process.env.CAPTURE_REVIEW_PATH || item.path === process.env.CAPTURE_REVIEW_PATH)) {
    for (const theme of ["light", "dark"] as const) {
      for (const size of [{ name: "desktop", width: 1440, height: 900 }, { name: "tablet", width: 768, height: 1024 }, { name: "mobile", width: 390, height: 844 }]) {
        const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
        const page = await context.newPage();
        await setup(page, view.role, theme);
        await page.goto(view.path);
        await expect(page.getByRole("heading", { name: view.heading, exact: true })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        if (process.env.CAPTURE_REVIEW_SCREENSHOTS === "1" && (size.name === "desktop" && theme === "light" || size.name === "mobile" && theme === "dark")) {
          await page.screenshot({ path: join(evidence, `${view.role}-${view.path.slice(1).replaceAll("/", "-")}-${theme}-${size.name}.png`), fullPage: true });
        }
        await context.close();
      }
    }
  }
});

test("monitoring filter separates clinical events from system updates", async ({ page }) => {
  await setup(page, "doctor", "light");
  await page.goto("/notifications");
  await expect(page.getByText("Observation needs review")).toBeVisible();
  await page.getByRole("button", { name: "Clinical events" }).click();
  await expect(page.getByText("Observation needs review")).toBeVisible();
  await expect(page.getByText("System update")).toHaveCount(0);
  await expect(page.getByText("Reading a notification does not resolve its underlying case.")).toBeVisible();
});

test("device status failure is not presented as disconnected", async ({ page }) => {
  await setup(page, "patient", "light");
  await page.route("**/integrations/withings/status/1", (route) => route.fulfill({ status: 503, json: { detail: "unavailable" } }));
  await page.goto("/devices");
  await expect(page.getByRole("alert").filter({ hasText: "Device status could not be loaded" })).toBeVisible();
  await expect(page.getByText("Connection status unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect Withings" })).toHaveCount(0);
});

test("sparse device observations disclose absent fields", async ({ page }) => {
  await setup(page, "patient", "light");
  await page.goto("/devices");
  await expect(page.getByRole("heading", { name: "Partial device observations" })).toBeVisible();
  await expect(page.getByText("Heart rate: 78 bpm")).toBeVisible();
  await expect(page.getByText(/Unavailable: spo2, systolic bp, diastolic bp/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synchronisation history" })).toBeVisible();
  await expect(page.getByText("0 complete, 1 partial and 1 rejected groups.")).toBeVisible();
});

test("research candidate is clearly separated from installed inference", async ({ page }) => {
  await setup(page, "doctor", "light");
  await page.goto("/analytics");
  await page.getByRole("button", { name: "Observed HR/BP candidate" }).click();
  await expect(page.getByText(/not serving predictions/)).toBeVisible();
  await expect(page.getByText(/Target preparation: observed next window/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "ROC curve" })).toBeVisible();
  if (process.env.CAPTURE_REVIEW_SCREENSHOTS === "1") {
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: join(evidence, "doctor-analytics-candidate-light-desktop.png"), fullPage: true });
  }
});

test("research workspace excludes fallback attributions and unexpired outcomes", async ({ page }) => {
  await setup(page, "admin", "light");
  await page.goto("/admin/research");
  await expect(page.getByRole("heading", { name: "Global SHAP analysis" })).toBeVisible();
  await expect(page.getByText("No genuine SHAP explanations are available in stored predictions.")).toBeVisible();
  await expect(page.getByText(/2 records using fallback or unknown methods and 0 other-version records are excluded/)).toBeVisible();
  const options = page.getByRole("combobox", { name: "Expired pending prediction" }).locator("option");
  await expect(options).toHaveCount(2);
  await expect(page.getByRole("textbox", { name: "Source evidence and rationale" })).toBeVisible();
});

test("new workspaces have no serious automated accessibility violations", async ({ browser }) => {
  test.setTimeout(180_000);
  for (const view of views) {
    for (const theme of ["light", "dark"] as const) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await setup(page, view.role, theme);
    await page.goto(view.path);
    await expect(page.getByRole("heading", { name: view.heading, exact: true })).toBeVisible();
    await page.waitForTimeout(600);
    const results = await new AxeBuilder({ page }).analyze();
    expect.soft(results.violations.filter((item) => ["critical", "serious"].includes(item.impact ?? "")).map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target.join(" ")) })), `${view.path} ${theme}`).toEqual([]);
    await context.close();
    }
  }
});

for (const view of views) {
  test(`${view.path} reflows at 200 percent zoom and remains keyboard usable`, async ({ browser }) => {
    test.setTimeout(45_000);
    const context = await browser.newContext({ viewport: { width: 640, height: 800 } });
    const page = await context.newPage();
    await setup(page, view.role, "light");
    await page.goto(view.path);
    await expect(page.getByRole("heading", { name: view.heading, exact: true })).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
    if (view.path === "/notifications") {
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to main content" });
      await expect(skip).toBeFocused();
      await skip.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();
      const clinical = page.getByRole("button", { name: "Clinical events" });
      await clinical.focus();
      await page.keyboard.press("Enter");
      await expect(clinical).toHaveAttribute("aria-pressed", "true");
    }
    await context.close();
  });
}
