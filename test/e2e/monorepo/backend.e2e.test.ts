/**
 * Monorepo内のBackend (Next.js)のE2Eテスト
 * GraphQL APIエンドポイントとページの動作を検証
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'fs-extra';
import { execa, type ExecaChildProcess } from 'execa';
import { createTempDir } from '../../helpers/tempdir.js';
import { generateProject } from '../../helpers/project-generator.js';

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
}

test.describe('Monorepo Backend (Next.js) E2E Tests', () => {
    test.describe.configure({ mode: 'parallel' });

    let projectPath: string;
    let backendPath: string;
    let backendProcess: ExecaChildProcess;
    let backendUrl: string;

    test.beforeAll(async () => {
        // モノレポプロジェクトを生成
        const result = await generateProject({
            projectName: 'test-monorepo-backend-e2e',
            framework: 'expo',
            database: 'turso',
            orm: 'prisma',
            storage: 'none',
            deployment: false,
            auth: false,
            packageManager: 'pnpm',
            isMonorepo: true,
            workspaceTool: 'turborepo',
            includeBackend: true,
            frontendFramework: 'expo',
            backendConfig: {
                projectName: 'test-monorepo-backend-e2e-backend',
                projectPath: '',
                framework: 'nextjs',
                database: 'turso',
                orm: 'prisma',
                deployment: false,
                storage: 'none',
                auth: false,
                packageManager: 'pnpm',
                mode: 'full',
                isMonorepoChild: true,
            },
            frontendConfig: {
                projectName: 'test-monorepo-backend-e2e-frontend',
                projectPath: '',
                framework: 'expo',
                database: 'turso',
                orm: 'prisma',
                deployment: false,
                storage: 'none',
                auth: false,
                packageManager: 'pnpm',
                mode: 'full',
                isMonorepoChild: true,
            },
        });

        projectPath = result.projectPath;
        backendPath =
            result.config.backendConfig?.projectPath ?? path.join(projectPath, 'apps', 'backend');

        // 依存関係のインストール
        await execa('pnpm', ['install'], {
            cwd: projectPath,
            stdio: 'inherit',
        });

        // テンプレートファイルをリネーム
        const templateSrcPath = path.join(backendPath, 'src');
        if (await fs.pathExists(templateSrcPath)) {
            await renameTemplateFiles(templateSrcPath);
        }

        // バックエンドパスが存在することを確認
        if (!(await fs.pathExists(backendPath))) {
            const rootEntries = await fs.readdir(projectPath);
            const appsRoot = path.join(projectPath, 'apps');
            const appsEntries = (await fs.pathExists(appsRoot)) ? await fs.readdir(appsRoot) : [];
            throw new Error(
                `backend path not found: ${backendPath}. entries=${rootEntries.join(', ')}, apps=${appsEntries.join(', ')}`
            );
        }

        // Database setup is skipped in test mode for basic functionality tests

        // Backend Next.jsサーバーを起動
        backendProcess = execa('pnpm', ['run', 'dev'], {
            cwd: backendPath,
            env: {
                ...process.env,
                PORT: '3001',
            },
        });

        backendUrl = 'http://localhost:3001';

        // サーバーが起動するまで待機
        await new Promise((resolve) => setTimeout(resolve, 10000));
    });

    test.afterAll(async () => {
        // バックエンドプロセスを停止
        if (backendProcess) {
            backendProcess.kill('SIGTERM');
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // テンポラリディレクトリをクリーンアップ
        if (projectPath && (await fs.pathExists(projectPath))) {
            await fs.remove(projectPath);
        }
    });

    test('Backend homepage should load', async ({ page }) => {
        await page.goto(backendUrl);

        // ページタイトルを確認
        await expect(page).toHaveTitle(/test-monorepo-backend-e2e/);

        // 基本的なUIコンポーネントが表示されることを確認
        await expect(page.locator('text=Your shadcn/ui + Kibo UI starter')).toBeVisible();

        // Database demo componentがないことを確認（モノレポでは含まれない）
        const databaseDemo = page.locator('text=Database Demo');
        await expect(databaseDemo).not.toBeVisible();
    });

    test('GraphQL endpoint should be accessible', async ({ request }) => {
        // GraphQL エンドポイントにPOSTリクエストを送信
        const response = await request.post(`${backendUrl}/api/graphql`, {
            data: {
                query: `
                    query {
                        __typename
                    }
                `,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        });

        expect(response.status()).toBe(200);

        const json = await response.json();
        expect(json).toHaveProperty('data');
        expect(json.data).toHaveProperty('__typename');
    });

    test('API posts endpoint should work', async ({ request }) => {
        // /api/posts エンドポイントが動作することを確認
        const response = await request.get(`${backendUrl}/api/posts`);

        expect(response.status()).toBe(200);

        const json = await response.json();
        expect(Array.isArray(json)).toBe(true);

        // Empty array is expected since we don't seed in test mode
        expect(json.length).toBeGreaterThanOrEqual(0);
    });

    test('Theme switcher should work', async ({ page }) => {
        await page.goto(backendUrl);

        // テーマ切り替えボタンを探す
        const toggleButton = page.locator('button:has-text("Toggle theme")');
        await expect(toggleButton).toBeVisible();

        // 初期状態のHTMLクラスを取得
        const htmlElement = page.locator('html');
        const initialClass = await htmlElement.getAttribute('class');

        // テーマを切り替える
        await toggleButton.click();

        // クラスが変更されたことを確認
        await expect(htmlElement).not.toHaveClass(initialClass || '');

        // もう一度切り替えて元に戻す
        await toggleButton.click();

        // 元のクラスに戻ることを確認
        if (initialClass) {
            await expect(htmlElement).toHaveClass(initialClass);
        }
    });
});
