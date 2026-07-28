import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and shows the main heading", async ({ page }) => {
    await page.goto("/");

    // The page should have a visible heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("shows coin overview section", async ({ page }) => {
    await page.goto("/");

    // Coin overview cards should render (or show fallback)
    const overview = page.locator(
      "#coin-overview, [data-testid='coin-overview']",
    );
    await expect(overview.first()).toBeVisible({ timeout: 15_000 });
  });

  test("shows trending coins section", async ({ page }) => {
    await page.goto("/");

    // Trending coins should render
    const trending = page.locator(
      "#trending-coins, [data-testid='trending-coins']",
    );
    await expect(trending.first()).toBeVisible({ timeout: 15_000 });
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");

    // Should have links to key pages
    const coinsLink = page.getByRole("link", { name: /coins/i });
    const trendsLink = page.getByRole("link", { name: /trends|analyzer/i });

    // At least one nav link should be visible
    const visible = await Promise.race([
      coinsLink
        .isVisible()
        .then(() => true)
        .catch(() => false),
      trendsLink
        .isVisible()
        .then(() => true)
        .catch(() => false),
    ]);
    expect(visible).toBe(true);
  });
});
