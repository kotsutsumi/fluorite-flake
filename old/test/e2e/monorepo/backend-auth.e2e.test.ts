import path from 'node:path';
/**
 * ユーザーが選択した構成（Expo + Turborepo + Turso + Prisma + Vercel Blob + 認証）で生成された monorepo の
 * Next.js バックエンドが DatabaseDemo の欠落によってビルドエラーにならないことを検証する。
 */
import { expect, test } from '@playwright/test';
import { type ExecaChildProcess, execa } from 'execa';
import fs from 'fs-extra';
import { generateProject } from '../../helpers/project-generator.js';

const SERVER_STARTUP_WAIT = 20_000; // Next.js dev サーバー起動待ち時間

async function renameTemplateFiles(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await renameTemplateFiles(fullPath);
            continue;
        }
        if (entry.name.endsWith('.template')) {
            const renamedPath = fullPath.replace(/\.template$/, '');
            await fs.rename(fullPath, renamedPath);
        }
    }
} // Next.js dev サーバー起動待ち時間

test.describe('Monorepo Backend with Auth regression', () => {
    test.describe.configure({ mode: 'serial' });

    let projectPath: string;
    let backendPath: string;
    let backendProcess: ExecaChildProcess | undefined;
    const backendUrl = 'http://localhost:3101';

    test.beforeAll(async () => {
        const result = await generateProject({
            projectName: 'monorepo-backend-auth-e2e',
            framework: 'expo',
            database: 'turso',
            orm: 'prisma',
            storage: 'vercel-blob',
            auth: true,
            packageManager: 'pnpm',
            isMonorepo: true,
            workspaceTool: 'turborepo',
            includeBackend: true,
            frontendFramework: 'expo',
            deployment: false,
            backendConfig: {
                projectName: 'monorepo-backend-auth-e2e-backend',
                projectPath: '',
                framework: 'nextjs',
                database: 'turso',
                orm: 'prisma',
                deployment: false,
                storage: 'vercel-blob',
                auth: true,
                packageManager: 'pnpm',
                mode: 'full',
                isMonorepoChild: true,
            },
            frontendConfig: {
                projectName: 'monorepo-backend-auth-e2e-frontend',
                projectPath: '',
                framework: 'expo',
                database: 'turso',
                orm: 'prisma',
                deployment: false,
                storage: 'vercel-blob',
                auth: true,
                packageManager: 'pnpm',
                mode: 'full',
                isMonorepoChild: true,
            },
        });

        projectPath = result.projectPath;
        backendPath =
            result.config.backendConfig?.projectPath ?? path.join(projectPath, 'apps', 'backend');

        await execa('pnpm', ['install'], { cwd: projectPath, stdio: 'inherit' });
        await renameTemplateFiles(path.join(backendPath, 'src'));
        if (!(await fs.pathExists(backendPath))) {
            const rootEntries = await fs.readdir(projectPath);
            const appsRoot = path.join(projectPath, 'apps');
            const appsEntries = (await fs.pathExists(appsRoot)) ? await fs.readdir(appsRoot) : [];
            throw new Error(
                `backend path not found: ${backendPath}. entries=${rootEntries.join(', ')}, apps=${appsEntries.join(', ')}`
            );
        }
        backendProcess = execa('pnpm', ['run', 'dev'], {
            cwd: backendPath,
            env: { ...process.env, PORT: '3101' },
        });

        await new Promise((resolve) => setTimeout(resolve, SERVER_STARTUP_WAIT));
    });

    test.afterAll(async () => {
        if (backendProcess) {
            backendProcess.kill('SIGTERM');
            await new Promise((resolve) => setTimeout(resolve, 2_000));
        }

        if (projectPath && (await fs.pathExists(projectPath))) {
            await fs.remove(projectPath);
        }
    });

    test('homepage renders without module errors', async ({ page }) => {
        const response = await page.goto(backendUrl, { waitUntil: 'networkidle' });
        expect(response?.status()).toBeLessThan(400);

        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('text=Module not found')).toHaveCount(0);
        await expect(page.locator("text=Can't resolve")).toHaveCount(0);
    });
});
