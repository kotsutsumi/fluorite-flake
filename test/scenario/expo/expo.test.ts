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

    describe('Expo + データベース構成', () => {
        it('Turso + Prisma 構成の Expo プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-expo-turso',
                framework: 'expo',
                database: 'turso',
                orm: 'prisma',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'package.json',
                'prisma/schema.prisma',
                'scripts/setup-turso.sh',
                'lib/db.ts',
            ]);

            expect(valid).toBe(true);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@prisma/client', '@libsql/client'],
                devDependencies: ['prisma'],
            });

            expect(depsValid).toBe(true);
        });

        it('Supabase + Drizzle 構成の Expo プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-expo-supabase',
                framework: 'expo',
                database: 'supabase',
                orm: 'drizzle',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'package.json',
                'drizzle.config.ts',
                'lib/supabase.ts',
                'lib/db.ts',
            ]);

            expect(valid).toBe(true);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@supabase/supabase-js', 'drizzle-orm'],
                devDependencies: ['drizzle-kit'],
            });

            expect(depsValid).toBe(true);
        });
    });

    describe('Expo + ストレージ構成', () => {
        it('Vercel Blob を用いたストレージ構成が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-expo-blob',
                framework: 'expo',
                database: 'none',
                storage: 'vercel-blob',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'package.json',
                'lib/storage.ts',
                'components/FileUpload.tsx',
            ]);

            expect(valid).toBe(true);
        });

        it('Supabase Storage を用いたストレージ構成が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-expo-supabase-storage',
                framework: 'expo',
                database: 'none',
                storage: 'supabase-storage',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid } = await verifyProjectStructure(projectPath, [
                'package.json',
                'lib/supabase.ts',
                'lib/storage.ts',
                'components/FileUpload.tsx',
            ]);

            expect(valid).toBe(true);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@supabase/supabase-js'],
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
