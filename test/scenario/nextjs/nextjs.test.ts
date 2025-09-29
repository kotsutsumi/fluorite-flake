/**
 * Next.js プロジェクト生成に関するシナリオテスト。
 * Fluorite Flake の CLI で生成される Next.js テンプレートが、各オプションの組み合わせに応じて
 * 必要なファイル・依存関係・環境変数を正しく出力できるかを網羅的に確認する。
 * テストでは実際にテンポラリディレクトリへプロジェクトを生成し、構成ファイルの存在や依存関係を検証する。
 */
import { describe, expect, it, afterAll } from 'vitest';
import path from 'node:path';
import { execa } from 'execa';
import {
    generateProject,
    verifyProjectStructure,
    verifyDependencies,
    verifyEnvFiles,
    TEST_CONFIGS,
} from '../../helpers/project-generator.js';
import { cleanupAllTempDirs } from '../../helpers/temp-dir.js';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

describe('Next.js プロジェクト生成のシナリオ検証', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    describe('基本的な Next.js プロジェクト生成', () => {
        it('データベース未使用の最小構成 Next.js プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-basic',
                framework: 'nextjs',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            // 最低限の構成ファイルが揃っているか確認する
            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'tsconfig.json',
                'next.config.mjs',
                '.env',
                '.env.local',
                '.env.development',
                '.env.staging',
                '.env.production',
                '.env.prod',
                'src/app/layout.tsx',
                'src/app/page.tsx',
                'src/styles/globals.css',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            // 必要な依存パッケージが package.json に含まれているか確認する
            const { valid: depsValid, missing } = await verifyDependencies(projectPath, {
                dependencies: ['next', 'react', 'react-dom'],
                devDependencies: ['typescript', '@types/node', '@types/react'],
            });

            expect(depsValid).toBe(true);
            expect(missing).toHaveLength(0);

            // 環境変数ファイルが全て生成されているか確認する
            const envResult = await verifyEnvFiles(projectPath, 'nextjs');
            expect(envResult.valid).toBe(true);
            expect(envResult.files).toContain('.env');
            expect(envResult.files).toContain('.env.local');
            expect(envResult.files).toContain('.env.development');
            expect(envResult.files).toContain('.env.staging');
            expect(envResult.files).toContain('.env.production');
            expect(envResult.files).toContain('.env.prod');
        });

        it('Vercel デプロイ設定付きの Next.js プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-vercel',
                framework: 'nextjs',
                database: 'none',
                storage: 'none',
                deployment: true,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'vercel.json',
                'scripts/setup-deployment.sh',
                'scripts/destroy-deployment.ts',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);
        });
    });

    describe('Next.js + Turso データベース構成', () => {
        it('Turso + Prisma 構成の Next.js プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-turso-prisma',
                framework: 'nextjs',
                database: 'turso',
                orm: 'prisma',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'prisma/schema.prisma',
                'prisma/seed.ts',
                'scripts/setup-turso.sh',
                'scripts/init-turso.sh',
                'scripts/dev-bootstrap.sh',
                'src/lib/db.ts',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@prisma/client', '@libsql/client'],
                devDependencies: ['prisma', '@prisma/adapter-libsql'],
            });

            expect(depsValid).toBe(true);
        });

        it('Turso + Drizzle 構成の Next.js プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-turso-drizzle',
                framework: 'nextjs',
                database: 'turso',
                orm: 'drizzle',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'drizzle.config.ts',
                'src/lib/db.ts',
                'src/db/schema.ts',
                'scripts/setup-turso.sh',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@libsql/client', 'drizzle-orm'],
                devDependencies: ['drizzle-kit'],
            });

            expect(depsValid).toBe(true);
        });

        it('Turso + Better Auth 構成の Next.js プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-turso-auth',
                framework: 'nextjs',
                database: 'turso',
                orm: 'prisma',
                storage: 'none',
                deployment: false,
                auth: true,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'src/lib/auth.ts',
                'src/lib/auth-client.ts',
                'src/app/api/auth/[...all]/route.ts',
                'src/components/auth/sign-in.tsx',
                'src/components/auth/sign-up.tsx',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['better-auth'],
            });

            expect(depsValid).toBe(true);
        });
    });

    describe('Next.js + Supabase データベース構成', () => {
        it('Supabase + Prisma 構成の Next.js プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-supabase-prisma',
                framework: 'nextjs',
                database: 'supabase',
                orm: 'prisma',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'prisma/schema.prisma',
                'src/lib/supabase.ts',
                'src/lib/db.ts',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@supabase/supabase-js', '@prisma/client'],
                devDependencies: ['prisma'],
            });

            expect(depsValid).toBe(true);
        });

        it('Supabase + Drizzle 構成の Next.js プロジェクトが生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-supabase-drizzle',
                framework: 'nextjs',
                database: 'supabase',
                orm: 'drizzle',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'drizzle.config.ts',
                'src/lib/supabase.ts',
                'src/lib/db.ts',
                'src/db/schema.ts',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@supabase/supabase-js', 'drizzle-orm', 'postgres'],
                devDependencies: ['drizzle-kit'],
            });

            expect(depsValid).toBe(true);
        });
    });

    describe('Next.js + 各種ストレージ構成', () => {
        it('Vercel Blob を用いたストレージ構成が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-blob',
                framework: 'nextjs',
                database: 'none',
                storage: 'vercel-blob',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'src/lib/storage.ts',
                'src/lib/storage-local.ts',
                'src/app/api/upload/route.ts',
                'src/app/api/storage/[...path]/route.ts',
                'src/components/file-upload.tsx',
                'scripts/setup-vercel-blob.sh',
                '.storage/.gitkeep',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@vercel/blob'],
            });

            expect(depsValid).toBe(true);
        });

        it('AWS S3 を用いたストレージ構成が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-s3',
                framework: 'nextjs',
                database: 'none',
                storage: 'aws-s3',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'src/lib/storage.ts',
                'src/app/api/upload/route.ts',
                'src/components/file-upload.tsx',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@aws-sdk/client-s3'],
            });

            expect(depsValid).toBe(true);
        });

        it('Cloudflare R2 を用いたストレージ構成が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-r2',
                framework: 'nextjs',
                database: 'none',
                storage: 'cloudflare-r2',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'src/lib/storage.ts',
                'src/app/api/upload/route.ts',
                'src/components/file-upload.tsx',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@aws-sdk/client-s3'],
            });

            expect(depsValid).toBe(true);
        });

        it('Supabase Storage を用いたストレージ構成が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-supabase-storage',
                framework: 'nextjs',
                database: 'none',
                storage: 'supabase-storage',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                'package.json',
                'src/lib/supabase.ts',
                'src/lib/storage.ts',
                'src/app/api/upload/route.ts',
                'src/components/file-upload.tsx',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: ['@supabase/supabase-js'],
            });

            expect(depsValid).toBe(true);
        });
    });

    describe('フル機能搭載の Next.js プロジェクト生成', () => {
        it('データベース・ストレージ・認証・デプロイなど全機能を有する構成が生成されること', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-full',
                framework: 'nextjs',
                database: 'turso',
                orm: 'prisma',
                storage: 'vercel-blob',
                deployment: true,
                auth: true,
                packageManager: 'pnpm',
            });

            const { valid, missingFiles } = await verifyProjectStructure(projectPath, [
                // Core files
                'package.json',
                'tsconfig.json',
                'next.config.mjs',
                // Environment files
                '.env',
                '.env.local',
                '.env.development',
                '.env.staging',
                '.env.production',
                '.env.prod',
                // Database files
                'prisma/schema.prisma',
                'src/lib/db.ts',
                'scripts/setup-turso.sh',
                // Storage files
                'src/lib/storage.ts',
                'src/lib/storage-local.ts',
                'src/app/api/upload/route.ts',
                // Auth files
                'src/lib/auth.ts',
                'src/app/api/auth/[...all]/route.ts',
                // Deployment files
                'scripts/deploy-to-vercel.sh',
                'scripts/env-tools.ts',
            ]);

            expect(valid).toBe(true);
            expect(missingFiles).toHaveLength(0);

            const { valid: depsValid } = await verifyDependencies(projectPath, {
                dependencies: [
                    'next',
                    'react',
                    '@prisma/client',
                    '@libsql/client',
                    '@vercel/blob',
                    'better-auth',
                ],
            });

            expect(depsValid).toBe(true);
        });
    });

    describe('Playwright E2E による Next.js 動作検証', () => {
        const runE2ETest =
            process.env.CI === 'true' || process.env.FLUORITE_SKIP_E2E === '1' ? it.skip : it;

        runE2ETest(
            'Playwright E2E フローが成功すること',
            async () => {
                const subprocess = execa(
                    'pnpm',
                    ['test:e2e', '--', 'test/e2e/nextjs.e2e.test.ts'],
                    {
                        env: {
                            ...process.env,
                            HUSKY: '0',
                            NEXT_TELEMETRY_DISABLED: '1',
                        },
                    }
                );

                subprocess.stdout?.on('data', (chunk) => process.stdout.write(chunk));
                subprocess.stderr?.on('data', (chunk) => process.stderr.write(chunk));

                await subprocess;
            },
            900_000
        );
    });
});
