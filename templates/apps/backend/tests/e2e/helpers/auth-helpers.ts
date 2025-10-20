/**
 * E2E test authentication helpers
 * Common authentication operations for Playwright tests
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { seedTestData } from "./setup-helpers";

let hasSeededTestData = false;

async function ensureTestData(page: Page) {
  if (hasSeededTestData) {
    return;
  }

  await seedTestData(page);
  hasSeededTestData = true;
}

type LoginOptions = {
  /**
   * Post-login navigation target. Defaults to the app root.
   */
  redirectTo?: string;
};

async function ensureResponseOk(response: Awaited<ReturnType<Page["request"]["post"]>>) {
  if (response.ok()) {
    return;
  }

  let message: string | undefined;

  try {
    const body = (await response.json()) as { message?: string; error?: { message?: string } };
    message = body.message ?? body.error?.message;
  } catch (_error) {
    // Response body is not JSON; fall back to status-based message below.
  }

  const errorMessage =
    message ??
    `Login failed with unexpected status ${response.status()} (${response.statusText()})`;

  throw new Error(errorMessage);
}

export async function login(page: Page, email: string, password: string, options?: LoginOptions) {
  await ensureTestData(page);

  // Clear cookies to avoid leaking authenticated state across tests.
  await page.context().clearCookies();

  const response = await page.request.post("/api/auth/sign-in/email", {
    data: {
      email,
      password,
    },
  });

  await ensureResponseOk(response);

  const redirectTo = options?.redirectTo ?? "/";
  await page.goto(redirectTo);
  await page.waitForLoadState("networkidle");

  if (/\/login/.test(page.url())) {
    throw new Error("Login failed: redirecting back to /login after sign-in");
  }
}

export async function logout(page: Page) {
  // ログアウトボタンを探す（メニュー内にある場合も想定）
  const logoutButton = page.getByRole("button", { name: /ログアウト|logout/i });

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    // 見つからない場合はドロップダウンメニュー内を探索
    const userMenu = page.getByRole("button", { name: /メニュー|menu/i });
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.getByRole("menuitem", { name: /ログアウト|logout/i }).click();
    }
  }

  // ログイン画面に戻るまで待機
  await page.waitForURL(/\/login/);
  await page.waitForLoadState("networkidle");

  // 念のためセッション Cookie をクリアし、後続テストに認証情報が残らないようにする。
  await page.context().clearCookies();
}

export async function ensureAuthenticated(page: Page, email: string, password: string) {
  // 毎回ログイン処理を行い、認証状態を確実にする
  // Playwright はテストごとにブラウザコンテキストを分離するため、事前にログインされていることはない
  await login(page, email, password);

  // 認証成功を検証
  await expect(page).not.toHaveURL(/\/login/);
}

export async function verifyUnauthorizedAccess(page: Page, url: string) {
  await page.goto(url);

  // ログイン画面へリダイレクトされたことを確認
  await page.waitForURL(/\/login/);
  await expect(page).toHaveURL(/\/login/);
}

export async function verifyForbiddenAccess(
  page: Page,
  email: string,
  password: string,
  url: string
) {
  // 先にログイン
  await ensureAuthenticated(page, email, password);

  // 権限外のページへアクセスを試みる
  await page.goto(url);

  // トップページへ戻るかアクセス拒否メッセージが表示されることを確認
  await page.waitForURL(/\/(|dashboard|profile)/);
  await expect(page).not.toHaveURL(url);
}

// EOF
