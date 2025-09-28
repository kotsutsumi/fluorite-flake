import { describe, expect, it, afterAll } from 'vitest';
import {
    generateProject,
    verifyProjectStructure,
    verifyDependencies,
} from '../../helpers/project-generator.js';
import { cleanupAllTempDirs } from '../../helpers/temp-dir.js';

describe('Expo project generation scenarios', () => {
    afterAll(async () => {
        await cleanupAllTempDirs();
    });

    describe('Basic Expo project', () => {
        it('should generate minimal Expo project without database', async () => {
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

    describe('Expo with database', () => {
        it('should generate Expo project with Turso + Prisma', async () => {
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

        it('should generate Expo project with Supabase + Drizzle', async () => {
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

    describe('Expo with storage', () => {
        it('should generate Expo project with Vercel Blob storage', async () => {
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

        it('should generate Expo project with Supabase storage', async () => {
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

    describe('Expo with authentication', () => {
        it('should generate Expo project with authentication', async () => {
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
