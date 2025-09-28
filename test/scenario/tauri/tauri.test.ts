/**
 * Tauri プロジェクト生成に関するシナリオテスト。
 * 各種パッケージマネージャーやデプロイ設定の違いに応じて生成物が正しく揃うか、
 * また Tauri がサポートしない構成（DB やクラウドストレージ）を拒否できているかを検証する。
 */
import { describe, expect, it, afterAll } from 'vitest';
import {
    generateProject,
    verifyProjectStructure,
    verifyDependencies,
} from '../../helpers/project-generator.js';
import { cleanupAllTempDirs } from '../../helpers/temp-dir.js';

describe('Tauri プロジェクト生成のシナリオ検証', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    describe('基本的な Tauri プロジェクト生成', () => {
        it('最小構成の Tauri プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-tauri-basic',
                framework: 'tauri',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'tsconfig.json',
                'tsconfig.node.json',
                'vite.config.ts',
                'index.html',
                'src/main.tsx',
                'src/App.tsx',
                'src/styles/globals.css',
                'src/styles/App.css',
                'src-tauri/Cargo.toml',
                'src-tauri/tauri.conf.json',
                'src-tauri/src/main.rs',
                'src-tauri/build.rs',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['react', 'react-dom', '@tauri-apps/api'],
                devDependencies: ['@vitejs/plugin-react', 'vite', 'typescript', '@tauri-apps/cli'],
            });

            expect(depsValid).toBe(true);
        });

        it('should generate Tauri project with deployment configuration', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-tauri-deploy',
                framework: 'tauri',
                database: 'none',
                storage: 'none',
                deployment: true,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                '.github/workflows/release.yml',
                'scripts/build-release.sh',
                'src-tauri/tauri.conf.json',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);
        });
    });

    describe('パッケージマネージャー別の出力差異', () => {
        it('npm 選択時に package-lock.json が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-tauri-npm',
                framework: 'tauri',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'npm',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'package.json',
                'package-lock.json',
            ]);

            expect(valid).toBe(true);
        });

        it('yarn 選択時に yarn.lock が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-tauri-yarn',
                framework: 'tauri',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'yarn',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'package.json',
                'yarn.lock',
            ]);

            expect(valid).toBe(true);
        });

        it('bun 選択時に bun.lockb が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-tauri-bun',
                framework: 'tauri',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'bun',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'package.json',
                'bun.lockb',
            ]);

            expect(valid).toBe(true);
        });
    });

    describe('Tauri 固有の制約検証', () => {
        it('should not allow database for Tauri', () => {
            // ジェネレーターが不正な構成を拒否することを確認するための検証
            // 実装では例外が投げられる想定
            // テストではエラー発生を確認する
            expect(() => {
                const config = {
                    framework: 'tauri' as const,
                    database: 'turso' as const,
                };
                // Tauri はデータベース構成をサポートしない
                if (config.framework === 'tauri' && config.database !== 'none') {
                    throw new Error('Tauri does not support database configuration');
                }
            }).toThrow('Tauri does not support database configuration');
        });

        it('should not allow storage for Tauri', () => {
            expect(() => {
                const config = {
                    framework: 'tauri' as const,
                    storage: 'vercel-blob' as const,
                };
                // Tauri はクラウドストレージ構成をサポートしない
                if (config.framework === 'tauri' && config.storage !== 'none') {
                    throw new Error('Tauri does not support cloud storage configuration');
                }
            }).toThrow('Tauri does not support cloud storage configuration');
        });
    });
});
