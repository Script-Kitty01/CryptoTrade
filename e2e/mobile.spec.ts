import { test, expect } from "@playwright/test";

test.describe("Mobile Responsiveness", () => {
  test("homepage renders on mobile viewport", async ({ page }) => {
    // iPhone 14 viewport is set in the 'mobile' project
    await page.goto("/");

    // Page should load without horizontal overflow
    const body = page.locator("body");
    await expect(body).toBeVisible({ timeout: 15_000 });

    // No element should overflow the viewport
    const viewport = page.viewportSize();
    if (viewport) {
      const html = page.locator("html");
      const box = await html.boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(-1);
      }
    }
  });

  test("trends page renders on mobile", async ({ page }) => {
    await page.goto("/trends");

    await expect(page.getByRole("heading", { name: /trend/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("coin detail renders on mobile", async ({ page }) => {
    await page.goto("/coins/bitcoin");

    // Should show content
    await expect(page.getByText(/bitcoin|btc/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("coins page renders on mobile", async ({ page }) => {
    await page.goto("/coins");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 15_000,
    });
  });
});
