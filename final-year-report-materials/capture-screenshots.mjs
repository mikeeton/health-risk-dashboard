import { chromium } from "../frontend/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const materialDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(materialDir, "screenshots");
const baseUrl = "http://127.0.0.1:5173";
const capturedAt = "2026-07-23T10:30:00Z";

const demoPatients = [
  {
    id: 101,
    user_id: 401,
    name: "Demo Patient A",
    age: 62,
    condition: "Hypertension (synthetic)",
    risk_level: "High",
    last_checkup: "2026-07-20",
  },
  {
    id: 102,
    user_id: 402,
    name: "Demo Patient B",
    age: 48,
    condition: "Type 2 diabetes (synthetic)",
    risk_level: "Moderate",
    last_checkup: "2026-07-18",
  },
];

const demoVitals = [
  [78, 98, 128, 79, 3.2],
  [82, 97, 132, 82, 4.0],
  [88, 96, 139, 86, 5.4],
  [94, 95, 146, 91, 6.8],
  [90, 96, 142, 88, 6.1],
].map(([heartRate, spo2, systolic, diastolic, risk], index) => ({
  id: 501 + index,
  patient_id: 101,
  timestamp: `2026-07-${19 + index}T09:00:00Z`,
  heart_rate: heartRate,
  spo2,
  systolic_bp: systolic,
  diastolic_bp: diastolic,
  steps: 4200 + index * 350,
  sleep_hours: 7.1 - index * 0.2,
  active_minutes: 35 + index * 3,
  calories: 1750 + index * 40,
  risk_score: risk,
  activity_state: "Resting",
}));

function demoResponse(pathname) {
  if (pathname === "/patients") return demoPatients;
  if (pathname.startsWith("/vitals/")) return demoVitals;
  if (pathname.startsWith("/medications/")) {
    return [
      {
        id: 601,
        patient_id: 101,
        name: "Demo medication",
        dosage: "5 mg",
        schedule_time: "08:00",
        status: "Taken",
        notes: "Synthetic report evidence",
      },
    ];
  }
  if (pathname === "/reviews") {
    return [
      {
        id: 701,
        patient_id: 101,
        patient_name: "Demo Patient A",
        risk_level: "High",
        risk_score: 6.8,
        status: "Under Review",
        note: "Synthetic escalation used only for interface evidence.",
        created_at: capturedAt,
        updated_at: capturedAt,
      },
    ];
  }
  if (pathname === "/assistant/patient-summary/101") {
    return {
      summary:
        "Risk Level: High\n\nSummary:\nSynthetic demonstration summary for report capture only; this is not a clinical assessment.\n\nConcerns:\n- Demonstration blood-pressure trend\n- Demonstration risk score increase\n\nRecommendation:\nA clinician should verify all source data before making any decision.",
      model_used: "Screenshot demonstration",
    };
  }
  if (pathname === "/admin/users/") {
    return [
      {
        id: 1,
        full_name: "Report Demo Administrator",
        email: "admin@report-demo.invalid",
        role: "admin",
        status: "active",
      },
      {
        id: 2,
        full_name: "Dr Demo Clinician",
        email: "doctor@report-demo.invalid",
        role: "doctor",
        status: "active",
      },
      {
        id: 3,
        full_name: "Nurse Demo Clinician",
        email: "nurse@report-demo.invalid",
        role: "nurse",
        status: "active",
      },
      {
        id: 4,
        full_name: "Demo Patient Account",
        email: "patient@report-demo.invalid",
        role: "patient",
        status: "active",
      },
    ];
  }
  if (pathname === "/registration-requests/") {
    return [
      {
        id: 801,
        email: "applicant@report-demo.invalid",
        full_name: "Demo Applicant",
        role: "patient",
        status: "pending",
        created_at: capturedAt,
        age: 55,
        conditions: "Synthetic application data",
      },
    ];
  }
  if (pathname === "/admin/assignments/patients") {
    return demoPatients.map((patient) => ({
      id: patient.id,
      name: patient.name,
      linked_user_id: patient.user_id,
      linked_user_email: `${patient.id}@report-demo.invalid`,
    }));
  }
  if (pathname === "/admin/assignments/staff" || pathname === "/referrals/staff") {
    return [
      {
        id: 2,
        full_name: "Dr Demo Clinician",
        email: "doctor@report-demo.invalid",
        role: "doctor",
        status: "active",
      },
      {
        id: 3,
        full_name: "Nurse Demo Clinician",
        email: "nurse@report-demo.invalid",
        role: "nurse",
        status: "active",
      },
    ];
  }
  if (pathname === "/admin/assignments/") {
    return [
      {
        id: 901,
        patient_id: 101,
        patient_name: "Demo Patient A",
        staff_user_id: 2,
        staff_name: "Dr Demo Clinician",
        staff_email: "doctor@report-demo.invalid",
        role: "doctor",
        status: "active",
        assigned_at: capturedAt,
      },
    ];
  }
  if (pathname === "/referrals/") {
    return [
      {
        id: 1001,
        patient_id: 101,
        patient_name: "Demo Patient A",
        referring_name: "Dr Demo Clinician",
        referring_email: "doctor@report-demo.invalid",
        receiving_user_id: 3,
        receiving_name: "Nurse Demo Clinician",
        receiving_email: "nurse@report-demo.invalid",
        receiving_role: "nurse",
        receiving_department: "Demonstration care team",
        reason: "Synthetic referral illustrating the approval workflow.",
        urgency: "High",
        notes: "No real patient information is included.",
        status: "pending",
        admin_note: null,
        requested_at: capturedAt,
      },
    ];
  }
  if (pathname === "/audit/") {
    return [
      {
        id: 1101,
        user_email: "doctor@report-demo.invalid",
        action: "CREATE_REVIEW_CASE",
        entity: "review_case",
        entity_id: "701",
        timestamp: capturedAt,
      },
      {
        id: 1102,
        user_email: "admin@report-demo.invalid",
        action: "APPROVE_REFERRAL",
        entity: "referral",
        entity_id: "1000",
        timestamp: "2026-07-22T14:10:00Z",
      },
    ];
  }
  if (pathname.startsWith("/ml/predict/")) {
    return {
      prediction_score: 6.8,
      prediction_level: "High — synthetic",
      confidence: 0,
      message: "Synthetic screenshot response; not a clinical result.",
    };
  }
  if (pathname === "/analytics/system-summary") {
    return {
      total_patients: 2,
      high_risk_patients: 1,
      open_review_cases: 1,
    };
  }
  return [];
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function newPage(role, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({
    viewport,
    colorScheme: "light",
    reducedMotion: "reduce",
  });

  await context.route("http://127.0.0.1:8000/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(demoResponse(pathname)),
    });
  });

  if (role) {
    await context.addInitScript((selectedRole) => {
      localStorage.setItem(
        "health-auth-user",
        JSON.stringify({
          id: 999,
          email: `${selectedRole}@report-demo.invalid`,
          full_name:
            selectedRole === "admin"
              ? "Report Demo Admin"
              : selectedRole === "doctor"
                ? "Dr Report Demo"
                : selectedRole === "nurse"
                  ? "Nurse Report Demo"
                  : "Report Demo Patient",
          role: selectedRole,
        }),
      );
      localStorage.setItem("health-auth-token", "report-capture-test-token");
      localStorage.setItem("health-theme", "light");
    }, role);
  }

  return { context, page: await context.newPage() };
}

async function capture(
  filename,
  route,
  role = null,
  viewport,
  fullPage = true,
  selector = null,
) {
  const { context, page } = await newPage(role, viewport);
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !document.body.innerText.includes("Loading..."),
    null,
    { timeout: 10_000 },
  );
  // The shell animates both sidebar width and main-content margin. Waiting for
  // those transitions prevents the report capture from clipping headings
  // beneath the sidebar.
  await page.waitForTimeout(2_500);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
  const screenshotPath = path.join(outputDir, filename);
  if (selector) {
    await page.locator(selector).screenshot({ path: screenshotPath });
  } else {
    await page.screenshot({ path: screenshotPath, fullPage });
  }
  await context.close();
}

const captures = [
  ["01-login-page.png", "/login", null],
  ["02-access-request.png", "/register", null],
  ["03-admin-dashboard.png", "/admin", "admin"],
  ["04-user-management.png", "/admin/users", "admin"],
  ["05-registration-approvals.png", "/admin/approvals", "admin"],
  ["06-staff-assignments.png", "/admin/assignments", "admin"],
  ["07-admin-referrals.png", "/admin/referrals", "admin"],
  ["08-audit-logs.png", "/audit-logs", "admin"],
  ["09-doctor-dashboard.png", "/doctor", "doctor"],
  [
    "10-advanced-analytics.png",
    "/analytics",
    "doctor",
    undefined,
    false,
  ],
  ["11-review-cases.png", "/review-cases", "doctor"],
  ["12-ai-assistant.png", "/ai-assistant", "doctor"],
  ["13-reports.png", "/reports", "doctor", undefined, false],
  ["14-nurse-dashboard.png", "/nurse", "nurse"],
  ["15-upload-vitals.png", "/upload", "nurse", undefined, false, "main"],
  ["16-patient-dashboard.png", "/patient", "patient"],
];

const captureOnly = new Set(
  (process.env.CAPTURE_ONLY ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

for (const args of captures) {
  if (captureOnly.size && !captureOnly.has(args[0])) continue;
  await capture(...args);
}

if (!captureOnly.size || captureOnly.has("17-login-mobile.png")) {
  await capture(
    "17-login-mobile.png",
    "/login",
    null,
    { width: 390, height: 844 },
  );
}

await browser.close();
