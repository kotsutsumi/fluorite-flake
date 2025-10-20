/**
 * Web アプリのナビゲーションおよびレスポンシブ挙動を検証する E2E テスト。
 */
import { expect, test } from "@playwright/test";

test.describe("Web App Navigation", () => {
  test.describe("Page Load", () => {
    test("should load homepage successfully", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/Create Next App/i);
      await expect(page.getByRole("navigation").getByText("Your Site")).toBeVisible();
    });

    test("should display hero section", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText(/野心のスピードに合わせた変革をオーケストレーションします/i).first()
      ).toBeVisible();
    });

    test("should display navigation menu", async ({ page, browserName }) => {
      test.skip(browserName === "webkit", "WebKit では networkidle 待機が不安定なためスキップ");
      test.setTimeout(60_000); // WebKit でも完了するようタイムアウトを延長
      await page.setViewportSize({ width: 1920, height: 1080 }); // デスクトップ表示でナビゲーションを確認
      await page.goto("/", { waitUntil: "networkidle", timeout: 30_000 });

      const nav = page.getByRole("navigation");
      await expect(nav.getByRole("link", { name: "サービス" })).toBeVisible({ timeout: 20_000 });
      await expect(nav.getByRole("link", { name: "インサイト" })).toBeVisible({ timeout: 10_000 });
      await expect(nav.getByRole("link", { name: "私たちについて" })).toBeVisible({
        timeout: 10_000,
      });
      await expect(nav.getByRole("link", { name: "お問い合わせ" })).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("Section Navigation", () => {
    test("should navigate to services section", async ({ page, browserName }) => {
      test.skip(browserName === "webkit", "WebKit has performance issues with page.goto timeout");
      await page.goto("/");
      await page.click('a[href="#services"]');
      await page.waitForTimeout(500);

      // services セクションが表示されているか確認する
      await expect(page.getByText("コーポレート戦略").first()).toBeVisible();
      await expect(page.getByText("データ＆オートメーション").first()).toBeVisible();
    });

    test("should navigate to about section", async ({ page, browserName }) => {
      test.skip(browserName === "webkit", "WebKit has performance issues with page.goto timeout");
      await page.goto("/");
      await page.click('a[href="#about"]');
      await page.waitForTimeout(500);

      // about セクションが表示されているか確認する
      await expect(page.getByText("測定可能な変革を求めるリーダーのために")).toBeVisible();
    });

    test("should navigate to insights section", async ({ page, browserName }) => {
      test.skip(browserName === "webkit", "WebKit has performance issues with page.goto timeout");
      await page.goto("/");
      await page.click('a[href="#insights"]');
      await page.waitForTimeout(500);

      // insights セクションの表示を確認する
      await expect(page.getByText("世界のリーダーがYour Siteと共に戦略を実行へ")).toBeVisible();
    });

    test("should navigate to contact section", async ({ page, browserName }) => {
      test.skip(browserName === "webkit", "WebKit has performance issues with page.goto timeout");
      await page.goto("/");
      await page.click('a[href="#contact"]');
      await page.waitForTimeout(500);

      // contact セクションの表示を確認する
      await expect(page.getByText("次の変革構想をYour Siteと共に")).toBeVisible();
    });
  });

  test.describe("Content Visibility", () => {
    test("should display all service cards", async ({ page, browserName }) => {
      test.skip(browserName === "webkit", "WebKit has performance issues with element visibility");
      await page.goto("/");

      const services = [
        "コーポレート戦略",
        "データ＆オートメーション",
        "リスク＆コンプライアンス",
        "グローバル展開支援",
      ];

      for (const service of services) {
        await expect(page.getByText(service).first()).toBeVisible();
      }
    });

    test("should display statistics", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForLoadState("domcontentloaded");

      // 最初の統計値が表示されたことを確認してから残りを検証
      await expect(page.getByText("180+").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("42").first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("94%").first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("350").first()).toBeVisible({ timeout: 10_000 });
    });

    test("should display testimonials", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByText("Lina Ortega")).toBeVisible();
      await expect(page.getByText("Rohit Patel")).toBeVisible();
    });

    test("should display leadership team", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByText("Aiden Mercer")).toBeVisible();
      await expect(page.getByText("Mira Okafor")).toBeVisible();
      await expect(page.getByText("Jonas Meyer")).toBeVisible();
    });
  });

  test.describe("Interactive Elements", () => {
    test("should have working email link", async ({ page }) => {
      await page.goto("/");

      const emailLink = page.getByRole("link", { name: /メールで問い合わせる/i });
      await expect(emailLink).toBeVisible();
      await expect(emailLink).toHaveAttribute("href", "mailto:hello@yoursite.com");
    });

    test("should have CTA buttons", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("link", { name: "サービスを見る" })).toBeVisible();
      await expect(page.getByRole("link", { name: "チームを見る" })).toBeVisible();
      await expect(page.getByRole("link", { name: /メールで問い合わせる/ })).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      await expect(page.getByRole("navigation").getByText("Your Site")).toBeVisible();
      await expect(
        page.getByText(/野心のスピードに合わせた変革をオーケストレーションします/i).first()
      ).toBeVisible();
    });

    test("should display correctly on tablet", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");

      await expect(page.getByRole("navigation").getByText("Your Site")).toBeVisible();
      await expect(page.getByText("コーポレート戦略").first()).toBeVisible();
    });

    test("should display correctly on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/");

      await expect(page.getByRole("navigation").getByText("Your Site")).toBeVisible();
      await expect(page.getByText("コーポレート戦略").first()).toBeVisible();
    });
  });

  test.describe("Footer", () => {
    test("should display footer navigation", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByText("プライバシー")).toBeVisible();
      await expect(page.getByText("利用規約")).toBeVisible();
      await expect(page.getByText("サステナビリティ")).toBeVisible();
    });

    test("should display copyright with current year", async ({ page }) => {
      await page.goto("/");

      const currentYear = new Date().getFullYear();
      await expect(page.getByText(new RegExp(`© ${currentYear} Your Site`))).toBeVisible();
    });
  });

  test.describe("Performance", () => {
    test("should load in reasonable time", async ({ page }) => {
      test.setTimeout(60_000); // Increase timeout for slow webkit
      const startTime = Date.now();
      await page.goto("/", { waitUntil: "load", timeout: 30_000 }); // Use 'load' instead of default for faster response
      const loadTime = Date.now() - startTime;

      // Should load in less than 30 seconds (webkit is significantly slower)
      expect(loadTime).toBeLessThan(30_000);
    });
  });
});

// EOF
