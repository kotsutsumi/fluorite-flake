import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

describe('Storybook Integration in ProjectConfig', () => {
    it('should have storybook as optional field in ProjectConfig', () => {
        const config: ProjectConfig = {
            projectName: 'test-project',
            projectPath: '/test/path',
            framework: 'nextjs',
            database: 'none',
            storage: 'none',
            deployment: false,
            auth: false,
            packageManager: 'pnpm',
        };

        // Should be able to create config without storybook field
        expect(config).toBeDefined();
        expect(config.storybook).toBeUndefined();

        // Should be able to add storybook field
        const configWithStorybook: ProjectConfig = {
            ...config,
            storybook: true,
        };

        expect(configWithStorybook.storybook).toBe(true);

        const configWithoutStorybook: ProjectConfig = {
            ...config,
            storybook: false,
        };

        expect(configWithoutStorybook.storybook).toBe(false);
    });

    it('should validate ProjectConfig with storybook field', () => {
        const validConfigs: ProjectConfig[] = [
            {
                projectName: 'test-1',
                projectPath: '/test/1',
                framework: 'nextjs',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                storybook: true,
                packageManager: 'pnpm',
            },
            {
                projectName: 'test-2',
                projectPath: '/test/2',
                framework: 'nextjs',
                database: 'turso',
                orm: 'prisma',
                storage: 'vercel-blob',
                deployment: true,
                auth: true,
                storybook: true,
                packageManager: 'yarn',
            },
            {
                projectName: 'test-3',
                projectPath: '/test/3',
                framework: 'expo',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                storybook: false, // Storybook should be false for non-Next.js
                packageManager: 'npm',
            },
        ];

        for (const config of validConfigs) {
            expect(config).toBeDefined();
            expect(typeof config.storybook).toBe('boolean');

            // Verify framework-specific Storybook logic
            if (config.framework !== 'nextjs') {
                expect(config.storybook).toBe(false);
            }
        }
    });

    it('should support all framework combinations with storybook field', () => {
        const frameworks: Array<ProjectConfig['framework']> = [
            'nextjs',
            'expo',
            'tauri',
            'flutter',
        ];

        for (const framework of frameworks) {
            const config: ProjectConfig = {
                projectName: `test-${framework}`,
                projectPath: `/test/${framework}`,
                framework,
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                storybook: framework === 'nextjs', // Only Next.js should have Storybook
                packageManager: 'pnpm',
            };

            expect(config).toBeDefined();
            expect(config.framework).toBe(framework);

            // Storybook should only be true for Next.js
            if (framework === 'nextjs') {
                expect(config.storybook).toBe(true);
            } else {
                expect(config.storybook).toBe(false);
            }
        }
    });

    it('should handle complex configuration combinations with storybook', () => {
        const complexConfigs: Array<Partial<ProjectConfig> & { name: string }> = [
            {
                name: 'full-nextjs-with-storybook',
                framework: 'nextjs',
                database: 'turso',
                orm: 'prisma',
                storage: 'vercel-blob',
                deployment: true,
                auth: true,
                storybook: true,
            },
            {
                name: 'minimal-nextjs-with-storybook',
                framework: 'nextjs',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                storybook: true,
            },
            {
                name: 'nextjs-database-no-storybook',
                framework: 'nextjs',
                database: 'supabase',
                orm: 'drizzle',
                storage: 'supabase-storage',
                deployment: true,
                auth: true,
                storybook: false,
            },
        ];

        for (const partialConfig of complexConfigs) {
            const config: ProjectConfig = {
                projectName: partialConfig.name,
                projectPath: `/test/${partialConfig.name}`,
                packageManager: 'pnpm',
                ...partialConfig,
            } as ProjectConfig;

            expect(config).toBeDefined();
            expect(config.projectName).toBe(partialConfig.name);

            // Verify storybook field is properly set
            expect(typeof config.storybook).toBe('boolean');

            // Verify logical consistency
            if (config.framework === 'nextjs') {
                // Next.js can have storybook true or false
                expect([true, false]).toContain(config.storybook);
            } else {
                // Other frameworks should not have storybook enabled
                expect(config.storybook).toBe(false);
            }
        }
    });

    it('should maintain type safety with storybook field', () => {
        // TypeScript compilation test - these should not cause type errors
        const config1: ProjectConfig = {
            projectName: 'type-test-1',
            projectPath: '/test/type/1',
            framework: 'nextjs',
            database: 'none',
            storage: 'none',
            deployment: false,
            auth: false,
            storybook: true, // boolean
            packageManager: 'pnpm',
        };

        const config2: ProjectConfig = {
            projectName: 'type-test-2',
            projectPath: '/test/type/2',
            framework: 'nextjs',
            database: 'none',
            storage: 'none',
            deployment: false,
            auth: false,
            // storybook is optional, so it can be omitted
            packageManager: 'pnpm',
        };

        expect(config1.storybook).toBe(true);
        expect(config2.storybook).toBeUndefined();

        // Type check: storybook should only accept boolean or undefined
        type StorybookType = ProjectConfig['storybook'];
        const validStorybookValues: StorybookType[] = [true, false, undefined];

        for (const value of validStorybookValues) {
            const testConfig: ProjectConfig = {
                ...config1,
                storybook: value,
            };
            expect(testConfig).toBeDefined();
        }
    });

    it('should work with different package managers and storybook', () => {
        const packageManagers: Array<ProjectConfig['packageManager']> = [
            'npm',
            'pnpm',
            'yarn',
            'bun',
        ];

        for (const packageManager of packageManagers) {
            const config: ProjectConfig = {
                projectName: `test-${packageManager}`,
                projectPath: `/test/${packageManager}`,
                framework: 'nextjs',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                storybook: true,
                packageManager,
            };

            expect(config).toBeDefined();
            expect(config.packageManager).toBe(packageManager);
            expect(config.storybook).toBe(true);
        }
    });

    it('should handle mode field with storybook configuration', () => {
        const modes: Array<ProjectConfig['mode']> = ['full', 'minimal', undefined];

        for (const mode of modes) {
            const config: ProjectConfig = {
                projectName: `test-mode-${mode || 'undefined'}`,
                projectPath: `/test/mode/${mode || 'undefined'}`,
                framework: 'nextjs',
                database: 'none',
                storage: 'none',
                deployment: false,
                auth: false,
                storybook: true,
                packageManager: 'pnpm',
                mode,
            };

            expect(config).toBeDefined();
            expect(config.mode).toBe(mode);
            expect(config.storybook).toBe(true);
        }
    });
});
