/**
 * Expo プロジェクト生成に関するシナリオテスト。
 * データベース・ストレージ・認証の各オプションを切り替えながら、生成物の構成ファイルや依存関係が
 * 期待どおりに出力されるかを検証する。テストは一時ディレクトリ上に実際のプロジェクトを生成して確認する。
 */
import { describe, expect, it, afterAll } from 'vitest';
import {
    generateProject,
    verifyProjectStructure,
    verifyDependencies,
} from '../../helpers/project-generator.js';
import { cleanupAllTempDirs } from '../../helpers/temp-dir.js';

describe('Expo プロジェクト生成のシナリオ検証', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    describe('基本的な Expo プロジェクト生成', () => {
        it('データベース未使用の最小構成 Expo プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-expo-basic',
                framework: 'expo',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'tsconfig.json',
                'app.json',
                'babel.config.js',
                'metro.config.js',
                'expo-env.d.ts',
                'app/_layout.tsx',
                'app/(tabs)/index.tsx',
                'app/(tabs)/_layout.tsx',
                'app/(tabs)/explore.tsx',
                'app/+not-found.tsx',
                '.maestro/README.md',
                '.maestro/smoke-test.yaml',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['expo', 'react', 'react-native', 'expo-router'],
                devDependencies: ['@babel/core', 'typescript'],
            });

            expect(depsValid).toBe(true);
        });
    });

    describe('Expo + 認証機能構成', () => {
        it('Supabase 認証を伴う Expo プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-expo-auth',
                framework: 'expo',
                database: 'supabase',
                orm: 'prisma',
                storage: 'none',
                deployment: false,
                auth: true,
                packageManager: 'pnpm',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'package.json',
                'lib/auth.ts',
                'app/(auth)/sign-in.tsx',
                'app/(auth)/sign-up.tsx',
                'components/auth/AuthProvider.tsx',
            ]);

            expect(valid).toBe(true);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['expo-auth-session', 'expo-secure-store', 'expo-web-browser'],
            });

            expect(depsValid).toBe(true);
        });
    });
});
