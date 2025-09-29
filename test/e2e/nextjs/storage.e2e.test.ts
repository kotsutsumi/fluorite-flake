import path from 'node:path';
import fs from 'node:fs/promises';
import { test, expect } from './fixtures/project.js';
import { createUniqueSuffix, login, logout, SAMPLE_AVATAR_PNG } from './utils.js';

test.use({
    stack: {
        database: 'turso',
        orm: 'prisma',
        storage: 'vercel-blob',
        auth: true,
        deployment: true,
    },
});

test.describe('@turso @storage', () => {
    test('profile avatar upload uses local storage adapter and persists file', async ({
        page,
        project,
    }) => {
        await login(page, project.baseURL, project.adminUser.email, project.adminUser.password);

        const suffix = createUniqueSuffix();

        await page.getByRole('link', { name: 'プロフィール' }).click();
        await expect(page.getByText('プロフィール', { exact: true })).toBeVisible();

        const avatarPayload = {
            name: `playwright-avatar-${suffix}.png`,
            mimeType: 'image/png',
            buffer: SAMPLE_AVATAR_PNG,
        };

        await page.setInputFiles('#avatar', avatarPayload);

        const profileResponsePromise = page.waitForResponse(
            (response) =>
                response.url().endsWith('/api/profile') && response.request().method() === 'PUT'
        );

        await page.getByRole('button', { name: '変更を保存する' }).click();
        const profileResponse = await profileResponsePromise;
        expect(profileResponse.status()).toBe(200);

        const profileBody = (await profileResponse.json()) as { imageUrl?: string | null };
        expect(profileBody.imageUrl).toBeTruthy();
        expect(profileBody.imageUrl).toContain('/api/storage/');
        await expect(page.getByText('プロフィールを更新しました。')).toBeVisible();

        const storageKey = (profileBody.imageUrl ?? '').replace('/api/storage/', '');
        expect(storageKey.length).toBeGreaterThan(0);

        const storageFilePath = path.join(project.storageDir, storageKey);

        await expect
            .poll(
                async () => {
                    try {
                        const stats = await fs.stat(storageFilePath);
                        return stats.size;
                    } catch {
                        return 0;
                    }
                },
                { message: `Waiting for ${storageKey} to be persisted in .storage` }
            )
            .toBeGreaterThan(0);

        await logout(page, project.baseURL);
    });
});
