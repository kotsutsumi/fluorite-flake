/**
 * E2E test setup helpers
 * Database seeding and test data management
 */
import type { Page } from "@playwright/test";

/**
 * Seed test data via API endpoint
 * Assumes a /api/test-setup endpoint exists for test data seeding
 */
export async function seedTestData(page: Page) {
  try {
    // テストデータを投入するセットアップエンドポイントを呼び出す
    const response = await page.request.post("/api/test-setup", {
      data: {
        action: "setup",
      },
    });

    if (!response.ok()) {
      // Seeding failed but continue
    }
  } catch (_error) {
    // Test setup endpoint unavailable, continue without seeding
  }
}

/**
 * Clean test data via API endpoint
 */
export async function cleanTestData(page: Page) {
  try {
    const response = await page.request.post("/api/test-setup", {
      data: {
        action: "cleanup",
      },
    });

    if (!response.ok()) {
      // Cleaning failed but continue
    }
  } catch (_error) {
    // Test cleanup endpoint unavailable, continue without cleanup
  }
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

// EOF
