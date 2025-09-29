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
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/`);
}

export async function logout(page: Page, baseURL: string) {
    await page.getByRole('button', { name: 'ログアウト' }).click();
    await expect(page).toHaveURL(`${baseURL}/login`);
}

export function createUniqueSuffix(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}
