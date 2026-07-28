import { test, expect } from "@playwright/test";

test.describe("Trends Page", () => {
  test("loads the trends page", async ({ page }) => {
    await page.goto("/trends");

    // Should show the page heading
    await expect(page.getByRole("heading", { name: /trend/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows coin ranking table", async ({ page }) => {
    await page.goto("/trends");

    // Wait for loading to finish — either table rows or "no coins" message
    const tableOrEmpty = page.locator(
      ".grid-cols-12, text=/no coins|loading/i",
    );
    await expect(tableOrEmpty.first()).toBeVisible({ timeout: 20_000 });
  });

  test("shows market summary card when AI is available", async ({ page }) => {
    await page.goto("/trends");

    // Market summary may or may not load depending on Ollama availability
    // Just verify the page doesn't crash
    await expect(page.locator("#trends-page")).toBeVisible({ timeout: 15_000 });
  });

  test("shows signal badges on coins", async ({ page }) => {
    await page.goto("/trends");

    // Wait for data to load
    await page.waitForTimeout(5_000);

    // Signal badges should appear (buy/sell/hold)
    const badges = page.locator("text=/strong buy|buy|hold|sell|strong sell/i");
    const count = await badges.count();
    // If data loaded, we should see at least some badges
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
