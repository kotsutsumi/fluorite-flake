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
        });

        projectPath = result.projectPath;
        backendPath = path.join(projectPath, 'apps', 'backend');

        // 依存関係のインストール
        await execa('pnpm', ['install'], {
            cwd: projectPath,
            stdio: 'inherit',
        });

        // データベースのセットアップ
        await execa('pnpm', ['run', 'db:push:force'], {
            cwd: backendPath,
            stdio: 'inherit',
        });

        await execa('pnpm', ['run', 'db:seed'], {
            cwd: backendPath,
            stdio: 'inherit',
        });

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

        // シードデータが存在することを確認
        expect(json.length).toBeGreaterThan(0);

        // 各投稿の構造を確認
        if (json.length > 0) {
            const post = json[0];
            expect(post).toHaveProperty('id');
            expect(post).toHaveProperty('title');
            expect(post).toHaveProperty('content');
            expect(post).toHaveProperty('published');
            expect(post).toHaveProperty('author');
        }
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
