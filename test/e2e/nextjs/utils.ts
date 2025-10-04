import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const SAMPLE_AVATAR_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NkYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=',
    'base64'
);

export async function login(page: Page, baseURL: string, email: string, password: string) {
    await page.goto(`${baseURL}/login`);
    await page.fill('#email', email);
    await page.fill('#password', password);

    // ログインボタンを押してレスポンスを待機
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();

    // 認証 API のレスポンスを待機
    await page.waitForResponse(
        (response) => response.url().includes('/api/auth/sign-in') && response.status() === 200,
        { timeout: 15000 }
    );

    // セッション確立のため少し待機
    await page.waitForTimeout(1000);

    // 自動リダイレクトされない場合はダッシュボードへ遷移
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
        await page.goto(`${baseURL}/`);
    }

    // ダッシュボードが読み込まれたことを確認
    await expect(page.getByText('fluorite-flake ダッシュボード')).toBeVisible({ timeout: 15000 });
}

export async function logout(page: Page, baseURL: string) {
    // ログアウトボタン押下後の画面遷移を待機
    await Promise.all([
        page.waitForURL(`${baseURL}/login`, { timeout: 15000 }),
        page.getByRole('button', { name: 'ログアウト' }).click(),
    ]);

    // 追加の確認: ログインフォームの要素を待機
    await expect(page.getByText('fluorite-flake ログイン')).toBeVisible({ timeout: 10000 });
}

export function createUniqueSuffix(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}
