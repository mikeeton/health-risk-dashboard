import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:5173';
const password = process.env.SCREENSHOT_PASSWORD;
if (!password) throw new Error('SCREENSHOT_PASSWORD is required.');
const scope = process.env.SCREENSHOT_SCOPE ?? 'all';
const shouldCapture = name => scope === 'all' || scope === name;

const output = path.resolve('../docs/dissertation/screenshots');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function newPage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  return { context, page };
}

async function login(page, email) {
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(url => !url.pathname.endsWith('/login'), {
    timeout: 20000,
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle');
}

async function snap(page, filename) {
  await page.screenshot({ path: path.join(output, filename), fullPage: false });
}

async function snapSection(page, heading, filename) {
  const section = page
    .getByRole('heading', { name: heading })
    .locator('xpath=ancestor::section[1]');
  await section.screenshot({ path: path.join(output, filename) });
}

try {
if (shouldCapture('public')) {
  const { context, page } = await newPage();
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await snap(page, '01-login.png');
  await context.close();
}

if (shouldCapture('doctor')) {
  const { context, page } = await newPage();
  await login(page, 'doctor@example.com');
  await page.goto(`${baseURL}/doctor`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Doctor Dashboard' }).waitFor();
  await snap(page, '02-doctor-dashboard.png');
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Six-Hour ML Prediction' }).waitFor();
  await page.getByText('Predicted 6-hour critical-event probability:', { exact: false }).waitFor();
  await snapSection(page, 'Six-Hour ML Prediction', '09-six-hour-ml-prediction.png');
  await page.goto(`${baseURL}/reports`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Reports & Export' }).waitFor();
  await page.getByText('predicted six-hour event probability', { exact: false }).waitFor();
  await snap(page, '10-reports-and-export.png');
  await page.goto(`${baseURL}/upload`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Upload Health Dataset', exact: true }).waitFor();
  await snap(page, '11-upload-health-dataset.png');
  await page.goto(`${baseURL}/ai-assistant`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Clinician Groq AI Assistant' }).waitFor();
  await snap(page, '03-ai-assistant.png');
  await page.goto(`${baseURL}/notifications`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Notifications' }).waitFor();
  await snap(page, '04-notifications.png');
  await context.close();
}

if (shouldCapture('nurse')) {
  const { context, page } = await newPage();
  await login(page, 'nurse@example.com');
  await page.goto(`${baseURL}/nurse`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Nurse Dashboard' }).waitFor();
  await snap(page, '05-nurse-dashboard.png');
  await context.close();
}

if (shouldCapture('admin')) {
  const { context, page } = await newPage();
  await login(page, 'admin@example.com');
  await page.goto(`${baseURL}/admin`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Admin Dashboard' }).waitFor();
  await snap(page, '06-admin-dashboard.png');
  await page.goto(`${baseURL}/admin/research`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Research evidence workspace' }).waitFor();
  await snap(page, '07-research-workspace.png');
  await context.close();
}

if (shouldCapture('patient')) {
  const { context, page } = await newPage();
  await login(page, 'sarah.johnson@example.com');
  await page.goto(`${baseURL}/patient`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Patient Dashboard' }).waitFor();
  await snap(page, '08-patient-dashboard.png');
  await context.close();
}

} finally {
  await browser.close();
}
console.log(`Screenshots saved to ${output}`);
