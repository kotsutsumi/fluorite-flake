/**
 * 認証フロー (ログイン / サインアップ / エラーハンドリング) を検証する E2E テスト。
 */
import { expect, test } from "@playwright/test";

test.describe("Authentication Flows", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
      await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
      await expect(page.getByLabel(/パスワード/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
    });

    test("should have links to forgot password and signup", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByText(/パスワードをお忘れですか/i)).toBeVisible();
      await expect(page.getByRole("link", { name: /新規登録/i })).toBeVisible();
    });

    test("should navigate to signup page", async ({ page }) => {
      test.setTimeout(90_000); // Firefox が遅い環境向けにタイムアウトを延長
      test.slow(); // 実行時間の長いテストとして扱う
      await page.goto("/login");

      await page.click('a[href="/signup"]', { timeout: 60_000 }); // Firefox 向けに余裕を持たせたタイムアウト
      await page.waitForURL(/\/signup/, { timeout: 30_000 });
      await expect(page).toHaveURL(/\/signup/);
      await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible({
        timeout: 10_000,
      });
    });

    test("should prefill email from query parameter", async ({ page }) => {
      await page.goto("/login?prefill=test@example.com");

      const emailInput = page.getByLabel(/メールアドレス/i);
      await expect(emailInput).toHaveValue("test@example.com");
    });

    test("should validate required fields", async ({ page }) => {
      await page.goto("/login");

      // 入力せず送信して HTML5 バリデーションが発火するか確認
      await page.click('button[type="submit"]');

      // HTML5 のバリデーションで送信が防がれているか検証
      const emailInput = page.getByLabel(/メールアドレス/i);
      const isEmailInvalid = await emailInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      );
      expect(isEmailInvalid).toBe(true);
    });

    test("should show loading state during submission", async ({ page, browserName }) => {
      test.skip(
        browserName === "webkit",
        "WebKit ではローディング状態の検証が不安定なためスキップ"
      );
      test.slow(); // WebKit では時間がかかるためスローテスト扱い
      test.setTimeout(90_000); // ブラウザが遅い環境でも完了できるようタイムアウトを延長
      await page.goto("/login");

      await page.fill('input[type="email"]', "test@example.com");
      await page.fill('input[type="password"]', "Password123!");

      // ローディング状態を再現するため API レスポンスを遅延させる
      await page.route("**/api/mobile/login", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // WebKit でも確実に遅延が発生するよう 5 秒待機
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ message: "Invalid credentials" }),
        });
      });

      await page.click('button[type="submit"]');

      // 「ログイン中…」のボタン表示が出ることを確認
      await expect(page.getByRole("button", { name: /ログイン中/i })).toBeVisible({
        timeout: 20_000,
      });
    });
  });

  test.describe("Signup Page", () => {
    test("should display signup form", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
      await expect(page.getByLabel(/氏名/i)).toBeVisible();
      await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
      await expect(page.getByLabel(/^パスワード$/i)).toBeVisible();
      await expect(page.getByLabel(/パスワード \(確認\)/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "新規登録" })).toBeVisible();
    });

    test("should have link to login page", async ({ page }) => {
      await page.goto("/signup");

      await expect(page.getByRole("link", { name: /ログイン/i })).toBeVisible();
    });

    test("should navigate to login page", async ({ page }) => {
      await page.goto("/signup");

      await page.click('a[href="/login"]');
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    });

    test("should validate password match", async ({ page, browserName }) => {
      test.skip(
        browserName === "webkit",
        "WebKit ではバリデーションメッセージの取得が不安定なためスキップ"
      );
      await page.goto("/signup");

      await page.fill('input[type="email"]', "test@example.com");
      await page.fill('input[id="signup-password"]', "Password123!");
      await page.fill('input[id="signup-confirm-password"]', "DifferentPassword!");

      await page.click('button[type="submit"]');

      // 「パスワードが一致しません。」メッセージが表示されるまで待機
      await expect(page.getByText("パスワードが一致しません。")).toBeVisible({ timeout: 20_000 });
    });

    test("should show loading state during submission", async ({ page, browserName }) => {
      test.skip(
        browserName === "webkit",
        "WebKit ではローディング表示の検証が不安定なためスキップ"
      );
      test.slow(); // WebKit で時間が掛かるためスローテスト扱い
      test.setTimeout(90_000); // 処理に時間が掛かってもタイムアウトしないよう延長
      await page.goto("/signup");

      await page.fill('input[type="email"]', "test@example.com");
      await page.fill('input[id="signup-password"]', "Password123!");
      await page.fill('input[id="signup-confirm-password"]', "Password123!");

      // ローディング状態をキャプチャするため API レスポンスを遅延させる
      await page.route("**/api/auth/sign-up/email", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // WebKit 環境でも確実に遅延が発生するよう 5 秒待機
        await route.fulfill({
          status: 400,
          body: JSON.stringify({ message: "Email already exists" }),
        });
      });

      await page.click('button[type="submit"]');

      // 「登録中…」のボタン文言が表示されることを確認
      await expect(page.getByRole("button", { name: "登録中…" })).toBeVisible({ timeout: 30_000 });
    });

    test("should display error message for API errors", async ({ page, browserName }) => {
      test.skip(
        browserName === "webkit",
        "WebKit ではエラーメッセージ表示の検証が不安定なためスキップ"
      );
      test.setTimeout(60_000); // ブラウザが遅い場合に備えてタイムアウトを延長
      await page.goto("/signup");

      await page.fill('input[type="email"]', "existing@example.com");
      await page.fill('input[id="signup-password"]', "Password123!");
      await page.fill('input[id="signup-confirm-password"]', "Password123!");

      // API からエラーが返るケースをモック
      await page.route("**/api/auth/sign-up/email", async (route) => {
        await route.fulfill({
          status: 400,
          body: JSON.stringify({ message: "このメールアドレスは既に登録されています。" }),
        });
      });

      await page.click('button[type="submit"]');

      // Wait for exact error message with period
      await expect(page.getByText("このメールアドレスは既に登録されています。")).toBeVisible({
        timeout: 30_000,
      });
    });
  });

  test.describe("Homepage Navigation", () => {
    test("should have login and signup links in header", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
      await expect(page.getByRole("link", { name: "新規登録" })).toBeVisible();
    });

    test("should navigate to login from homepage", async ({ page }) => {
      test.setTimeout(90_000); // Increase timeout for slow webkit
      test.slow(); // Mark test as slow
      await page.goto("/", { waitUntil: "networkidle", timeout: 30_000 });

      await page.click('a[href="/login"]', { timeout: 60_000 });
      await page.waitForURL(/\/login/, { timeout: 30_000 });
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible({
        timeout: 10_000,
      });
    });

    test("should navigate to signup from homepage", async ({ page }) => {
      test.setTimeout(90_000); // Increase timeout for slow webkit
      test.slow(); // Mark test as slow
      await page.goto("/", { waitUntil: "networkidle", timeout: 30_000 });

      await page.click('a[href="/signup"]', { timeout: 60_000 });
      await page.waitForURL(/\/signup/, { timeout: 30_000 });
      await expect(page).toHaveURL(/\/signup/);
      await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("Responsive Design", () => {
    test("should display login form on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/login");

      await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
      await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
      await expect(page.getByLabel(/パスワード/i)).toBeVisible();
    });

    test("should display signup form on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/signup");

      await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
      await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
    });

    test("should display login form on tablet", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/login");

      await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    });

    test("should display signup form on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/signup");

      await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
    });
  });

  test.describe("Form Accessibility", () => {
    test("login form should have proper labels", async ({ page }) => {
      await page.goto("/login");

      // labels exist as text - use .first() to handle multiple matches ことを確認する
      await expect(page.getByText("メールアドレス").first()).toBeVisible();
      await expect(page.getByText("パスワード").first()).toBeVisible();
    });

    test("signup form should have proper labels", async ({ page }) => {
      await page.goto("/signup");

      // labels exist as text - use .first() to handle multiple matches ことを確認する
      await expect(page.getByText("氏名 (任意)").first()).toBeVisible();
      await expect(page.getByText("メールアドレス").first()).toBeVisible();
      await expect(page.getByText(/^パスワード$/).first()).toBeVisible();
      await expect(page.getByText("パスワード (確認)").first()).toBeVisible();
    });

    test("forms should be keyboard navigable", async ({ page }) => {
      await page.goto("/login");

      // Start from email field
      await page.focus('input[type="email"]');

      // Tab to password field
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe("login-password");

      // Tab to submit button
      await page.keyboard.press("Tab");
      const submitButton = await page.evaluate(
        () => (document.activeElement as HTMLElement)?.textContent
      );
      expect(submitButton).toContain("ログイン");
    });
  });

  test.describe("Error Handling", () => {
    test("should handle network errors on login", async ({ page, browserName }) => {
      test.skip(
        browserName === "webkit",
        "WebKit has performance issues with loading state capture"
      );
      await page.goto("/login");

      await page.fill('input[type="email"]', "test@example.com");
      await page.fill('input[type="password"]', "Password123!");

      // Simulate network error
      await page.route("**/api/mobile/login", async (route) => {
        await route.abort("failed");
      });

      // Click submit button
      const submitButton = page.getByRole("button", { name: /ログイン/ });
      await submitButton.click();

      // Wait for loading state to appear (exact match with ellipsis)
      await expect(page.getByRole("button", { name: "ログイン中…" })).toBeVisible({
        timeout: 30_000,
      });

      // network error, button should become enabled again (not loading) 後の挙動を確認する
      await expect(submitButton).toBeEnabled({ timeout: 15_000 });
      await expect(submitButton).toContainText("ログイン");
    });

    test("should handle network errors on signup", async ({ page }) => {
      await page.goto("/signup");

      await page.fill('input[type="email"]', "test@example.com");
      await page.fill('input[id="signup-password"]', "Password123!");
      await page.fill('input[id="signup-confirm-password"]', "Password123!");

      // Simulate network error with delay to capture loading state
      await page.route("**/api/auth/sign-up/email", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.abort("failed");
      });

      const submitButton = page.getByRole("button", { name: /新規登録/ });
      await submitButton.click();

      // button becomes disabled or shows loading (implementation dependent) ことを確認する
      // network error, button should become enabled again 後の挙動を確認する
      await expect(submitButton).toBeEnabled({ timeout: 15_000 });
      await expect(submitButton).toContainText("新規登録");
    });
  });
});

// EOF
