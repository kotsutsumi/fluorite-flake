import { describe, expect, it } from 'vitest';

import type {
    DatabaseType,
    FrameworkConfig,
    FrameworkFeatures,
    FrameworkType,
    FrameworkVersions,
    OrmType,
    PackageManagerType,
    StorageType,
} from '../../../src/config/framework-configs/types.js';

describe('framework-configs types', () => {
    describe('FrameworkType', () => {
        it('should accept valid framework types', () => {
            const frameworks: FrameworkType[] = ['nextjs', 'expo', 'tauri', 'flutter'];
            for (const framework of frameworks) {
                expect(typeof framework).toBe('string');
            }
        });

        it('should be used as object keys', () => {
            const frameworkMap: Record<FrameworkType, string> = {
                nextjs: 'Next.js',
                expo: 'Expo',
                tauri: 'Tauri',
                flutter: 'Flutter',
            };
            expect(Object.keys(frameworkMap)).toHaveLength(4);
        });
    });

    describe('DatabaseType', () => {
        it('should accept valid database types', () => {
            const databases: DatabaseType[] = ['none', 'turso', 'supabase'];
            for (const database of databases) {
                expect(typeof database).toBe('string');
            }
        });

        it('should include none as default option', () => {
            const noneDatabase: DatabaseType = 'none';
            expect(noneDatabase).toBe('none');
        });

        it('should be used in arrays', () => {
            const supportedDatabases: DatabaseType[] = ['none', 'turso'];
            expect(supportedDatabases).toContain('none');
            expect(supportedDatabases).toContain('turso');
        });
    });

    describe('OrmType', () => {
        it('should accept valid ORM types', () => {
            const orms: OrmType[] = ['prisma', 'drizzle'];
            for (const orm of orms) {
                expect(typeof orm).toBe('string');
            }
        });

        it('should support both major ORMs', () => {
            const prisma: OrmType = 'prisma';
            const drizzle: OrmType = 'drizzle';
            expect(prisma).toBe('prisma');
            expect(drizzle).toBe('drizzle');
        });
    });

    describe('StorageType', () => {
        it('should accept valid storage types', () => {
            const storageTypes: StorageType[] = [
                'none',
                'vercel-blob',
                'cloudflare-r2',
                'aws-s3',
                'supabase-storage',
            ];
            for (const storage of storageTypes) {
                expect(typeof storage).toBe('string');
            }
        });

        it('should include none as default option', () => {
            const noneStorage: StorageType = 'none';
            expect(noneStorage).toBe('none');
        });

        it('should support major cloud providers', () => {
            const cloudProviders: StorageType[] = ['vercel-blob', 'cloudflare-r2', 'aws-s3'];
            expect(cloudProviders).toHaveLength(3);
        });
    });

    describe('PackageManagerType', () => {
        it('should accept valid package manager types', () => {
            const packageManagers: PackageManagerType[] = ['npm', 'pnpm', 'yarn', 'bun'];
            for (const pm of packageManagers) {
                expect(typeof pm).toBe('string');
            }
        });

        it('should support all major package managers', () => {
            const npm: PackageManagerType = 'npm';
            const pnpm: PackageManagerType = 'pnpm';
            const yarn: PackageManagerType = 'yarn';
            const bun: PackageManagerType = 'bun';

            expect([npm, pnpm, yarn, bun]).toHaveLength(4);
        });
    });

    describe('FrameworkFeatures', () => {
        it('should have all required boolean properties', () => {
            const features: FrameworkFeatures = {
                database: true,
                auth: false,
                storage: true,
                deployment: false,
                packageManager: true,
            };

            expect(typeof features.database).toBe('boolean');
            expect(typeof features.auth).toBe('boolean');
            expect(typeof features.storage).toBe('boolean');
            expect(typeof features.deployment).toBe('boolean');
            expect(typeof features.packageManager).toBe('boolean');
        });

        it('should allow all features enabled', () => {
            const allEnabled: FrameworkFeatures = {
                database: true,
                auth: true,
                storage: true,
                deployment: true,
                packageManager: true,
            };

            expect(Object.values(allEnabled).every((value) => value === true)).toBe(true);
        });

        it('should allow all features disabled', () => {
            const allDisabled: FrameworkFeatures = {
                database: false,
                auth: false,
                storage: false,
                deployment: false,
                packageManager: false,
            };

            expect(Object.values(allDisabled).every((value) => value === false)).toBe(true);
        });

        it('should allow mixed feature configuration', () => {
            const mixedFeatures: FrameworkFeatures = {
                database: true,
                auth: false,
                storage: true,
                deployment: false,
                packageManager: true,
            };

            const enabledCount = Object.values(mixedFeatures).filter((value) => value).length;
            expect(enabledCount).toBe(3);
        });
    });

    describe('FrameworkVersions', () => {
        it('should accept string key-value pairs', () => {
            const versions: FrameworkVersions = {
                react: '18.2.0',
                next: '13.0.0',
                typescript: '^5.0.0',
            };

            for (const [packageName, version] of Object.entries(versions)) {
                expect(typeof packageName).toBe('string');
                expect(typeof version).toBe('string');
            }
        });

        it('should support version ranges', () => {
            const versions: FrameworkVersions = {
                'exact-version': '1.0.0',
                'caret-range': '^2.0.0',
                'tilde-range': '~3.1.0',
                'greater-than': '>=4.0.0',
                'compound-range': '>=1.0.0 <2.0.0',
            };

            expect(Object.keys(versions)).toHaveLength(5);
        });

        it('should be flexible with package names', () => {
            const versions: FrameworkVersions = {
                react: '18.2.0',
                '@types/node': '^18.0.0',
                'my-custom-package': '1.0.0',
            };

            expect(versions['@types/node']).toBe('^18.0.0');
            expect(versions['my-custom-package']).toBe('1.0.0');
        });

        it('should allow empty versions object', () => {
            const emptyVersions: FrameworkVersions = {};
            expect(Object.keys(emptyVersions)).toHaveLength(0);
        });
    });

    describe('FrameworkConfig', () => {
        it('should have all required properties', () => {
            const config: FrameworkConfig = {
                name: 'test-framework',
                displayName: 'Test Framework',
                defaultName: 'my-test-app',
                description: 'A test framework for unit tests',
                supportedFeatures: {
                    database: true,
                    auth: true,
                    storage: false,
                    deployment: true,
                    packageManager: true,
                },
                supportedDatabases: ['none', 'turso'],
                supportedOrms: ['prisma'],
                supportedStorage: ['none'],
                versions: {
                    'test-core': '1.0.0',
                    'test-cli': '^2.0.0',
                },
                requiredDependencies: ['test-core'],
                devDependencies: ['test-cli'],
            };

            expect(typeof config.name).toBe('string');
            expect(typeof config.displayName).toBe('string');
            expect(typeof config.defaultName).toBe('string');
            expect(typeof config.description).toBe('string');
            expect(typeof config.supportedFeatures).toBe('object');
            expect(Array.isArray(config.supportedDatabases)).toBe(true);
            expect(Array.isArray(config.supportedOrms)).toBe(true);
            expect(Array.isArray(config.supportedStorage)).toBe(true);
            expect(typeof config.versions).toBe('object');
            expect(Array.isArray(config.requiredDependencies)).toBe(true);
            expect(Array.isArray(config.devDependencies)).toBe(true);
        });

        it('should support minimal configuration', () => {
            const minimalConfig: FrameworkConfig = {
                name: 'minimal',
                displayName: 'Minimal Framework',
                defaultName: 'minimal-app',
                description: 'Minimal test framework',
                supportedFeatures: {
                    database: false,
                    auth: false,
                    storage: false,
                    deployment: false,
                    packageManager: false,
                },
                supportedDatabases: ['none'],
                supportedOrms: [],
                supportedStorage: ['none'],
                versions: {},
                requiredDependencies: [],
                devDependencies: [],
            };

            expect(minimalConfig.supportedOrms).toHaveLength(0);
            expect(minimalConfig.requiredDependencies).toHaveLength(0);
            expect(minimalConfig.devDependencies).toHaveLength(0);
        });

        it('should support comprehensive configuration', () => {
            const comprehensiveConfig: FrameworkConfig = {
                name: 'comprehensive',
                displayName: 'Comprehensive Framework',
                defaultName: 'comprehensive-app',
                description: 'Full-featured framework for testing',
                supportedFeatures: {
                    database: true,
                    auth: true,
                    storage: true,
                    deployment: true,
                    packageManager: true,
                },
                supportedDatabases: ['none', 'turso', 'supabase'],
                supportedOrms: ['prisma', 'drizzle'],
                supportedStorage: [
                    'none',
                    'vercel-blob',
                    'cloudflare-r2',
                    'aws-s3',
                    'supabase-storage',
                ],
                versions: {
                    core: '1.0.0',
                    cli: '2.0.0',
                    plugins: '^3.0.0',
                    types: '~4.1.0',
                },
                requiredDependencies: ['core', 'cli'],
                devDependencies: ['plugins', 'types'],
            };

            expect(comprehensiveConfig.supportedDatabases).toHaveLength(3);
            expect(comprehensiveConfig.supportedOrms).toHaveLength(2);
            expect(comprehensiveConfig.supportedStorage).toHaveLength(5);
            expect(Object.keys(comprehensiveConfig.versions)).toHaveLength(4);
        });

        it('should enforce type constraints', () => {
            const config: FrameworkConfig = {
                name: 'nextjs' as FrameworkType, // Must be valid FrameworkType
                displayName: 'Next.js',
                defaultName: 'my-next-app',
                description: 'React framework',
                supportedFeatures: {
                    database: true,
                    auth: true,
                    storage: true,
                    deployment: true,
                    packageManager: true,
                },
                supportedDatabases: ['none', 'turso'] as DatabaseType[], // Must be DatabaseType[]
                supportedOrms: ['prisma'] as OrmType[], // Must be OrmType[]
                supportedStorage: ['none', 'vercel-blob'] as StorageType[], // Must be StorageType[]
                versions: {
                    next: '13.0.0',
                },
                requiredDependencies: ['next'],
                devDependencies: ['typescript'],
            };

            expect(config.name).toBe('nextjs');
            expect(config.supportedDatabases).toContain('turso');
            expect(config.supportedOrms).toContain('prisma');
            expect(config.supportedStorage).toContain('vercel-blob');
        });
    });

    describe('type composition and usage', () => {
        it('should work together in realistic scenarios', () => {
            const framework: FrameworkType = 'nextjs';
            const database: DatabaseType = 'turso';
            const orm: OrmType = 'prisma';
            const storage: StorageType = 'vercel-blob';
            const packageManager: PackageManagerType = 'pnpm';

            const projectConfig = {
                framework,
                database,
                orm,
                storage,
                packageManager,
            };

            expect(projectConfig.framework).toBe('nextjs');
            expect(projectConfig.database).toBe('turso');
            expect(projectConfig.orm).toBe('prisma');
            expect(projectConfig.storage).toBe('vercel-blob');
            expect(projectConfig.packageManager).toBe('pnpm');
        });

        it('should support configuration validation patterns', () => {
            interface ConfigValidation {
                framework: FrameworkType;
                database: DatabaseType;
                storage: StorageType;
                valid: boolean;
            }

            const validConfigs: ConfigValidation[] = [
                { framework: 'nextjs', database: 'turso', storage: 'vercel-blob', valid: true },
                { framework: 'expo', database: 'supabase', storage: 'aws-s3', valid: true },
                { framework: 'tauri', database: 'none', storage: 'none', valid: true },
                { framework: 'flutter', database: 'none', storage: 'none', valid: true },
            ];

            for (const config of validConfigs) {
                expect(config.valid).toBe(true);
                expect(typeof config.framework).toBe('string');
                expect(typeof config.database).toBe('string');
                expect(typeof config.storage).toBe('string');
            }
        });
    });
});
