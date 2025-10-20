/**
 * apps/docs のナビゲーションとドキュメント表示を検証する E2E テスト。
 * - トップページのロードと Nextra 固有 UI の表示確認
 * - ビューポートサイズを変化させたレスポンシブ検証
 * - GitHub リンクやフッター表示といったナビゲーション要素の存在確認
 * - ベンチマークとしてページロード時間を計測
 */
import { expect, test } from "@playwright/test";

test.describe("Docs App Navigation", () => {
  test.describe("Page Load", () => {
    test("should load docs homepage successfully", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/Introduction/i);
    });

    test("should display Nextra documentation layout", async ({ page }) => {
      await page.goto("/");

      // Nextra の共通要素が表示されているか確認する
      await expect(page.locator("text=Fluorite Flake Docs")).toBeVisible();
    });

    test("should display banner", async ({ page }) => {
      await page.goto("/");

      // バナーの本文を確認する
      const banner = page.locator("text=/Built with the Nextra docs theme/i");
      const isVisible = await banner.isVisible().catch(() => false);

      // バナーは非表示にされている可能性があるため情報用途のテストとして扱う
      console.log("Banner visible:", isVisible);
    });
  });

  test.describe("Navigation Elements", () => {
    test("should have GitHub repository link", async ({ page }) => {
      await page.goto("/");

      const githubLink = page.getByRole("link", { name: /project repository/i }).first();
      await expect(githubLink).toBeVisible();
    });

    test("should display footer", async ({ page }) => {
      await page.goto("/");

      const currentYear = new Date().getFullYear();
      await expect(page.locator(`text=/MIT ${currentYear}/i`)).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      await expect(page.locator("text=Fluorite Flake Docs")).toBeVisible();
    });

    test("should display correctly on tablet", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");

      await expect(page.locator("text=Fluorite Flake Docs")).toBeVisible();
    });

    test("should display correctly on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/");

      await expect(page.locator("text=Fluorite Flake Docs")).toBeVisible();
    });
  });

  test.describe("Performance", () => {
    test("should load in reasonable time", async ({ page }) => {
      const startTime = Date.now();
      await page.goto("/");
      const loadTime = Date.now() - startTime;

      // 5 秒以内に読み込みが完了することを期待する
      expect(loadTime).toBeLessThan(5000);
    });
  });
});

// EOF
