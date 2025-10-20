/**
 * Expo (web) 版モバイルアプリの認証 E2E テスト。
 * - backend (apps/backend) のユーザー資格情報でログインできること
 * - ページ再読み込み後もセッションが維持されていること
 */
import { expect, test } from "@playwright/test";

const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://localhost:3001";

// テストユーザーは backend のシードデータ (apps/backend/lib/test-data.ts) と整合する必要がある
const TEST_EMAIL = process.env.MOBILE_E2E_EMAIL ?? "member@test.com";
const TEST_PASSWORD = process.env.MOBILE_E2E_PASSWORD ?? "Member123!@#";

test.describe("Mobile Auth", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${BACKEND_BASE_URL}/api/test-setup`, {
      data: { action: "setup" },
    });
    if (!response.ok()) {
      throw new Error(
        `Failed to prepare backend test data: ${response.status()} ${response.statusText()}`
      );
    }
    console.log(`[mobile-e2e] test setup response: ${await response.text()}`);
  });

  test("logs in via backend user and keeps session after reload", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/login");

    page.on("console", (message) => {
      // Playwright logs are surfaced to aid debugging when running in CI / headless environments
      console.log(`[mobile-console] ${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => {
      console.log(`[mobile-error] ${error.message}`);
    });
    page.on("requestfailed", (request) => {
      console.log(
        `[mobile-request-failed] ${request.url()} ${request.failure()?.errorText ?? "unknown error"}`
      );
    });
    page.on("response", (response) => {
      if (response.url().includes("/api/graphql")) {
        console.log(`[mobile-response] ${response.status()} ${response.url()}`);
      }
    });

    const emailInput = page.locator('input[placeholder="you@example.com"]');
    const passwordInput = page.locator('input[placeholder="********"]');

    await expect(emailInput).toBeVisible({ timeout: 60_000 });

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    const loginButton = page.getByText("ログイン", { exact: true }).first();
    await loginButton.scrollIntoViewIfNeeded();
    const loginResponsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/graphql") &&
          response.request().postData()?.includes("mutation Login"),
        { timeout: 20_000 }
      )
      .catch(() => null);

    await loginButton.tap().catch(async () => {
      await loginButton.click({ force: true });
    });

    const loginResponse = await loginResponsePromise;
    if (loginResponse) {
      console.log(`[mobile-e2e] login response: ${await loginResponse.text()}`);
    } else {
      console.log("[mobile-e2e] login response: request not observed within timeout");
    }

    const storedToken = await page.evaluate(() => window.localStorage.getItem("sessionToken"));
    console.log(`[mobile-e2e] token after login: ${storedToken}`);
    expect(storedToken).not.toBeNull();

    try {
      const dismissButton = page.getByText("Dismiss", { exact: true });
      await dismissButton.first().click({ timeout: 2000 });
    } catch (_error) {
      // オーバーレイが表示されていない場合は無視
    }

    await page.reload();

    const pathAfterReload = await page.evaluate(() => window.location.pathname);
    expect(pathAfterReload).toBe("/");

    const tokenAfterReload = await page.evaluate(() => window.localStorage.getItem("sessionToken"));
    expect(tokenAfterReload).toBe(storedToken);
  });
});

// EOF
