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

test.describe('@turso @users', () => {
    test('admin can provision a user that can log in with limited permissions', async ({
        page,
        project,
    }) => {
        await login(page, project.baseURL, project.adminUser.email, project.adminUser.password);

        const suffix = createUniqueSuffix();
        const newUserEmail = `playwright.user+${suffix}@example.com`;
        const newUserPassword = project.defaultUserPassword;

        await page.getByRole('link', { name: 'ユーザー管理' }).click();
        await expect(page.getByText('ユーザー管理', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'ユーザーを追加' }).click();
        await page.fill('#user-name', 'Playwright Automation');
        await page.fill('#user-email', newUserEmail);
        await page.fill('#user-password', newUserPassword);
        await page.getByRole('button', { name: '作成する' }).click();
        await expect(page.getByRole('cell', { name: newUserEmail })).toBeVisible();

        await project.run('node', [
            '--input-type=module',
            '-e',
            `const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
try {
    const user = await prisma.user.findUnique({ where: { email: '${newUserEmail}' } });
    if (!user) {
        console.error('User not found after creation');
        process.exit(1);
    }
} finally {
    await prisma.$disconnect();
}`,
        ]);

        await logout(page, project.baseURL);

        await login(page, project.baseURL, newUserEmail, newUserPassword);
        await expect(
            page.getByText('fluorite-flake ダッシュボード', { exact: true })
        ).toBeVisible();
        await expect(page.getByRole('link', { name: '組織管理' })).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'ユーザー管理' })).toBeVisible();

        await logout(page, project.baseURL);
    });
});
