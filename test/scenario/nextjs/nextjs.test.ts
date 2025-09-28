import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import {
    generateProject,
    verifyProjectStructure,
    verifyDependencies,
    verifyEnvFiles,
    TEST_CONFIGS,
} from '../../helpers/project-generator.js';
import { cleanupAllTempDirs } from '../../helpers/temp-dir.js';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

describe('Next.js project generation scenarios', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    describe('Basic Next.js project', () => {
        it('should generate minimal Next.js project without database', async () => {
            const { projectPath } = await generateProject({
                projectName: 'test-nextjs-basic',
                framework: 'nextjs',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'pnpm',
            });

            // Verify basic structure
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

            // Verify dependencies
            const { valid: depsValid, missing } = await verifyDependencies(projectPath, {
                dependencies: ['next', 'react', 'react-dom'],
                devDependencies: ['typescript', '@types/node', '@types/react'],
            });

            expect(depsValid).toBe(true);
            expect(missing).toHaveLength(0);

            // Verify environment files
            const envResult = await verifyEnvFiles(projectPath, 'nextjs');
            expect(envResult.valid).toBe(true);
            expect(envResult.files).toContain('.env');
            expect(envResult.files).toContain('.env.local');
            expect(envResult.files).toContain('.env.development');
            expect(envResult.files).toContain('.env.staging');
            expect(envResult.files).toContain('.env.production');
            expect(envResult.files).toContain('.env.prod');
        });

        it('should generate Next.js project with Vercel deployment', async () => {
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

    describe('Next.js with Turso database', () => {
        it('should generate Next.js project with Turso + Prisma', async () => {
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

        it('should generate Next.js project with Turso + Drizzle', async () => {
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

        it('should generate Next.js project with Turso + Auth', async () => {
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

    describe('Next.js with Supabase database', () => {
        it('should generate Next.js project with Supabase + Prisma', async () => {
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

        it('should generate Next.js project with Supabase + Drizzle', async () => {
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

    describe('Next.js with storage options', () => {
        it('should generate Next.js project with Vercel Blob storage', async () => {
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

        it('should generate Next.js project with AWS S3 storage', async () => {
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

        it('should generate Next.js project with Cloudflare R2 storage', async () => {
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

        it('should generate Next.js project with Supabase storage', async () => {
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

    describe('Full-featured Next.js project', () => {
        it('should generate complete Next.js project with all features', async () => {
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
});
