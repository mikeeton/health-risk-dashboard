import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/login", "/register"]) {
  test(`${path} has no serious automated accessibility violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => ["critical", "serious"].includes(item.impact ?? ""))).toEqual([]);
  });
}

test("keyboard users can skip directly to main content", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("reduced-motion preference disables nonessential animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  const duration = await page.locator("main").evaluate(element => getComputedStyle(element).transitionDuration);
  expect(["0s", "0.00001s", "1e-05s"]).toContain(duration);
});

test("login remains usable at 200 percent zoom", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/login");
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(overflow).toBe(false);
});
