import { test, expect } from './fixtures/project.js';
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

test.describe('@turso @content', () => {
    test('admin can publish a dashboard post that persists to the database', async ({
        page,
        project,
    }) => {
        await login(page, project.baseURL, project.adminUser.email, project.adminUser.password);

        const suffix = createUniqueSuffix();
        const postTitle = `Playwright Post ${suffix}`;
        const postContent = 'This post was created during automated E2E verification.';

        await page.getByRole('button', { name: 'New Post' }).click();
        await page.fill('input[placeholder="Post title"]', postTitle);
        await page.fill('textarea[placeholder="Post content"]', postContent);
        await page.fill('input[placeholder="Author email"]', project.adminUser.email);
        await page.getByRole('button', { name: 'Create Post' }).click();

        await expect(page.getByText(postTitle, { exact: true })).toBeVisible();
        await page.reload();
        await expect(page.getByText(postTitle, { exact: true })).toBeVisible();

        await project.run('node', [
            '--input-type=module',
            '-e',
            `const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
try {
    const post = await prisma.post.findFirst({ where: { title: '${postTitle}' } });
    if (!post) {
        console.error('Post not found after creation');
        process.exit(1);
    }
} finally {
    await prisma.$disconnect();
}`,
        ]);

        await logout(page, project.baseURL);
    });
});
