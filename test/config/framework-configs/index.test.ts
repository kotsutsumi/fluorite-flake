import { describe, expect, it } from 'vitest';

// Test all exports from the index file
import {
    DATABASE_CONFIGS,
    FRAMEWORK_CONFIGS,
    STORAGE_CONFIGS,
    getFrameworkConfig,
    getSupportedDatabases,
    getSupportedStorage,
    supportsFeature,
    validateConfiguration,
} from '../../../src/config/framework-configs/index.js';

// Test type exports (these will fail at compile time if types aren't exported)
import type {
    DatabaseType,
    FrameworkConfig,
    FrameworkFeatures,
    FrameworkType,
    FrameworkVersions,
    OrmType,
    PackageManagerType,
    StorageType,
} from '../../../src/config/framework-configs/index.js';

describe('framework-configs index exports', () => {
    describe('constant exports', () => {
        it('should export FRAMEWORK_CONFIGS', () => {
            expect(FRAMEWORK_CONFIGS).toBeDefined();
            expect(typeof FRAMEWORK_CONFIGS).toBe('object');
            expect(FRAMEWORK_CONFIGS.nextjs).toBeDefined();
            expect(FRAMEWORK_CONFIGS.expo).toBeDefined();
            expect(FRAMEWORK_CONFIGS.tauri).toBeDefined();
            expect(FRAMEWORK_CONFIGS.flutter).toBeDefined();
        });

        it('should export DATABASE_CONFIGS', () => {
            expect(DATABASE_CONFIGS).toBeDefined();
            expect(typeof DATABASE_CONFIGS).toBe('object');
            expect(DATABASE_CONFIGS.turso).toBeDefined();
            expect(DATABASE_CONFIGS.supabase).toBeDefined();
        });

        it('should export STORAGE_CONFIGS', () => {
            expect(STORAGE_CONFIGS).toBeDefined();
            expect(typeof STORAGE_CONFIGS).toBe('object');
            expect(STORAGE_CONFIGS['vercel-blob']).toBeDefined();
            expect(STORAGE_CONFIGS['cloudflare-r2']).toBeDefined();
            expect(STORAGE_CONFIGS['aws-s3']).toBeDefined();
            expect(STORAGE_CONFIGS['supabase-storage']).toBeDefined();
        });
    });

    describe('function exports', () => {
        it('should export getFrameworkConfig function', () => {
            expect(typeof getFrameworkConfig).toBe('function');
            const config = getFrameworkConfig('nextjs');
            expect(config).toBeDefined();
            expect(config.name).toBe('nextjs');
        });

        it('should export supportsFeature function', () => {
            expect(typeof supportsFeature).toBe('function');
            const result = supportsFeature('nextjs', 'database');
            expect(typeof result).toBe('boolean');
        });

        it('should export getSupportedDatabases function', () => {
            expect(typeof getSupportedDatabases).toBe('function');
            const databases = getSupportedDatabases('nextjs');
            expect(Array.isArray(databases)).toBe(true);
        });

        it('should export getSupportedStorage function', () => {
            expect(typeof getSupportedStorage).toBe('function');
            const storage = getSupportedStorage('nextjs');
            expect(Array.isArray(storage)).toBe(true);
        });

        it('should export validateConfiguration function', () => {
            expect(typeof validateConfiguration).toBe('function');
            const result = validateConfiguration({
                framework: 'nextjs',
                database: 'none',
                storage: 'none',
            });
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('errors');
        });
    });

    describe('integration tests', () => {
        it('should work with all exported functions together', () => {
            // Get a framework config
            const frameworkConfig = getFrameworkConfig('nextjs');
            expect(frameworkConfig).toBeDefined();

            // Check feature support
            const databaseSupport = supportsFeature('nextjs', 'database');
            expect(databaseSupport).toBe(true);

            // Get supported databases
            const databases = getSupportedDatabases('nextjs');
            expect(databases.length).toBeGreaterThan(1);

            // Get supported storage
            const storage = getSupportedStorage('nextjs');
            expect(storage.length).toBeGreaterThan(1);

            // Validate configuration
            const validation = validateConfiguration({
                framework: 'nextjs',
                database: databases[1], // Use a non-none database
                storage: storage[1], // Use a non-none storage
            });
            expect(validation.valid).toBe(true);
        });

        it('should maintain consistency between configs and helpers', () => {
            const framework: FrameworkType = 'nextjs';
            const frameworkConfig = getFrameworkConfig(framework);
            const supportedDatabases = getSupportedDatabases(framework);
            const supportedStorage = getSupportedStorage(framework);

            // Helper functions should return same data as config objects
            expect(supportedDatabases).toEqual(frameworkConfig.supportedDatabases);
            expect(supportedStorage).toEqual(frameworkConfig.supportedStorage);

            // Feature support should match config
            expect(supportsFeature(framework, 'database')).toBe(
                frameworkConfig.supportedFeatures.database
            );
            expect(supportsFeature(framework, 'auth')).toBe(frameworkConfig.supportedFeatures.auth);
            expect(supportsFeature(framework, 'storage')).toBe(
                frameworkConfig.supportedFeatures.storage
            );
        });
    });

    describe('type validation', () => {
        it('should provide correct TypeScript types', () => {
            // These tests validate that the types are properly exported and work
            const _frameworkType: FrameworkType = 'nextjs';
            const databaseType: DatabaseType = 'turso';
            const ormType: OrmType = 'prisma';
            const storageType: StorageType = 'vercel-blob';
            const _packageManagerType: PackageManagerType = 'pnpm';

            const features: FrameworkFeatures = {
                database: true,
                auth: true,
                storage: true,
                deployment: true,
                packageManager: true,
            };

            const versions: FrameworkVersions = {
                next: '15.5.4',
                react: '19.0.0',
            };

            const config: FrameworkConfig = {
                name: 'nextjs',
                displayName: 'Next.js',
                defaultName: 'my-app',
                description: 'Test framework',
                supportedFeatures: features,
                supportedDatabases: [databaseType],
                supportedOrms: [ormType],
                supportedStorage: [storageType],
                versions: versions,
                requiredDependencies: [],
                devDependencies: [],
            };

            // If the types compile, this test passes
            expect(config.name).toBe('nextjs');
        });
    });

    describe('re-export validation', () => {
        it('should re-export all constants correctly', () => {
            // Verify that re-exported constants have expected structure
            expect(Object.keys(FRAMEWORK_CONFIGS)).toHaveLength(4);
            expect(Object.keys(DATABASE_CONFIGS)).toHaveLength(2);
            expect(Object.keys(STORAGE_CONFIGS)).toHaveLength(4);
        });

        it('should re-export all helper functions correctly', () => {
            // Test that all helper functions are callable and return expected types
            const helpers = [
                getFrameworkConfig,
                supportsFeature,
                getSupportedDatabases,
                getSupportedStorage,
                validateConfiguration,
            ];

            for (const helper of helpers) {
                expect(typeof helper).toBe('function');
            }
        });
    });

    describe('completeness check', () => {
        it('should export all expected items', () => {
            // Check constants exist - they're already imported at the top
            expect(FRAMEWORK_CONFIGS).toBeDefined();
            expect(DATABASE_CONFIGS).toBeDefined();
            expect(STORAGE_CONFIGS).toBeDefined();

            // Check functions exist - they're already imported at the top
            expect(typeof getFrameworkConfig).toBe('function');
            expect(typeof supportsFeature).toBe('function');
            expect(typeof getSupportedDatabases).toBe('function');
            expect(typeof getSupportedStorage).toBe('function');
            expect(typeof validateConfiguration).toBe('function');
        });
    });
});
