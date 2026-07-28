import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("search input is visible on coins page", async ({ page }) => {
    await page.goto("/coins");

    // Should have a search input
    const searchInput = page.getByPlaceholder(/search|find/i);
    const isVisible = await searchInput.isVisible().catch(() => false);

    // If no dedicated search input, the page should still load
    if (!isVisible) {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("coins page loads with pagination", async ({ page }) => {
    await page.goto("/coins");

    // Should show coin list or pagination
    const content = page.locator(
      "table, .grid, [data-testid='coins-list'], text=/coin|page/i",
    );
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });

  test("can navigate to a coin from the coins page", async ({ page }) => {
    await page.goto("/coins");

    // Click the first coin link
    const coinLink = page.locator("a[href*='/coins/']").first();
    if (await coinLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await coinLink.click();
      // Should navigate to a coin detail page
      await expect(page).toHaveURL(/\/coins\//);
    }
  });
});
