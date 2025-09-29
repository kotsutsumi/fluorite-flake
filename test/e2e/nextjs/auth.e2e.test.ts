import { test, expect } from './fixtures/project.js';
import { login, logout } from './utils.js';

test.use({
    stack: {
        database: 'turso',
        orm: 'prisma',
        storage: 'vercel-blob',
        auth: true,
        deployment: true,
    },
});

test.describe('@turso @auth', () => {
    test('admin can authenticate and reach dashboard', async ({ page, project }) => {
        await login(page, project.baseURL, project.adminUser.email, project.adminUser.password);

        await expect(
            page.getByText('fluorite-flake ダッシュボード', { exact: true })
        ).toBeVisible();
        await expect(page.getByRole('link', { name: '組織管理' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'ユーザー管理' })).toBeVisible();

        await logout(page, project.baseURL);
    });

    test('unauthenticated visitor is redirected from dashboard', async ({ page, project }) => {
        await page.goto(`${project.baseURL}/`);
        await expect(page).toHaveURL(`${project.baseURL}/login`);
        await expect(page.getByText('fluorite-flake ログイン', { exact: true })).toBeVisible();
    });
});
