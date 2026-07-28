import { test, expect } from "@playwright/test";

test.describe("Coin Detail Page", () => {
  test("navigates to bitcoin detail page", async ({ page }) => {
    await page.goto("/coins/bitcoin");

    // Should show the coin name or symbol
    await expect(page.getByText(/bitcoin|btc/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows price information", async ({ page }) => {
    await page.goto("/coins/bitcoin");

    // Should have a price displayed (format: $XX,XXX.XX)
    const priceText = page.locator("text=/\\$[\\d,]+/");
    await expect(priceText.first()).toBeVisible({ timeout: 15_000 });
  });

  test("shows candlestick chart", async ({ page }) => {
    await page.goto("/coins/bitcoin");

    // The chart container should be present
    const chart = page.locator(
      "#candlestick-chart, [data-testid='candlestick-chart']",
    );
    await expect(chart.first()).toBeVisible({ timeout: 15_000 });
  });

  test("shows converter component", async ({ page }) => {
    await page.goto("/coins/bitcoin");

    // Converter should be on the page
    const converter = page.locator("#converter, [data-testid='converter']");
    await expect(converter.first()).toBeVisible({ timeout: 15_000 });
  });

  test("shows error state for invalid coin", async ({ page }) => {
    await page.goto("/coins/nonexistent-coin-xyz-123");

    // Should show an error or fallback message
    const errorOrFallback = page.locator(
      "text=/not found|error|unavailable|rate limit/i",
    );
    await expect(errorOrFallback.first()).toBeVisible({ timeout: 15_000 });
  });
});
