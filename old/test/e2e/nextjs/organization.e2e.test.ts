import { expect, test } from './fixtures/project.js';
import { createUniqueSuffix, login, logout } from './utils.js';

test.use({
    stack: {
        database: 'turso',
        orm: 'prisma',
        storage: 'vercel-blob',
        auth: true,
        deployment: true,
    },
});

test.describe('@turso @organization', () => {
    test('admin can create and persist a new organization', async ({ page, project }) => {
        await login(page, project.baseURL, project.adminUser.email, project.adminUser.password);

        const suffix = createUniqueSuffix();
        const organizationName = `Playwright Org ${suffix}`;
        const organizationSlug = `playwright-org-${suffix}`;

        await page.getByRole('link', { name: '組織管理' }).click();
        await expect(page.getByText('組織一覧', { exact: true })).toBeVisible();

        await page.getByRole('button', { name: '組織を追加' }).click();
        await page.fill('#organization-name', organizationName);
        await page.fill('#organization-slug', organizationSlug);
        await page.fill('#organization-metadata', '{"tier":"platinum"}');
        await page.getByRole('button', { name: '登録する' }).click();

        await expect(page.getByRole('cell', { name: organizationName })).toBeVisible();

        await page.reload();
        await expect(page.getByRole('cell', { name: organizationName })).toBeVisible();

        await logout(page, project.baseURL);
    });
});
