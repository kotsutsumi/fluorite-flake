import { describe, expect, it } from 'vitest';

import { FRAMEWORK_CONFIGS } from '../../../src/config/framework-configs/frameworks.js';
import type {
    DatabaseType,
    FrameworkType,
    OrmType,
    StorageType,
} from '../../../src/config/framework-configs/types.js';

describe('FRAMEWORK_CONFIGS', () => {
    const _validFrameworks: FrameworkType[] = ['nextjs', 'expo', 'tauri', 'flutter'];
    const validDatabases: DatabaseType[] = ['none', 'turso', 'supabase'];
    const validOrms: OrmType[] = ['prisma', 'drizzle'];
    const validStorageTypes: StorageType[] = [
        'none',
        'vercel-blob',
        'cloudflare-r2',
        'aws-s3',
        'supabase-storage',
    ];

    describe('framework configs structure', () => {
        it('should have all expected frameworks', () => {
            expect(FRAMEWORK_CONFIGS).toHaveProperty('nextjs');
            expect(FRAMEWORK_CONFIGS).toHaveProperty('expo');
            expect(FRAMEWORK_CONFIGS).toHaveProperty('tauri');
            expect(FRAMEWORK_CONFIGS).toHaveProperty('flutter');
        });

        it('should have exactly 4 framework configurations', () => {
            expect(Object.keys(FRAMEWORK_CONFIGS)).toHaveLength(4);
        });

        it('should have consistent structure for all framework configs', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                expect(config).toHaveProperty('name');
                expect(config).toHaveProperty('displayName');
                expect(config).toHaveProperty('defaultName');
                expect(config).toHaveProperty('description');
                expect(config).toHaveProperty('supportedFeatures');
                expect(config).toHaveProperty('supportedDatabases');
                expect(config).toHaveProperty('supportedOrms');
                expect(config).toHaveProperty('supportedStorage');
                expect(config).toHaveProperty('versions');
                expect(config).toHaveProperty('requiredDependencies');
                expect(config).toHaveProperty('devDependencies');

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
            }
        });
    });

    describe('Next.js configuration', () => {
        const nextjsConfig = FRAMEWORK_CONFIGS.nextjs;

        it('should have correct basic properties', () => {
            expect(nextjsConfig.name).toBe('nextjs');
            expect(nextjsConfig.displayName).toBe('Next.js');
            expect(nextjsConfig.defaultName).toBe('my-next-app');
            expect(nextjsConfig.description).toBe(
                'React framework for production-ready web applications'
            );
        });

        it('should support all features', () => {
            expect(nextjsConfig.supportedFeatures.database).toBe(true);
            expect(nextjsConfig.supportedFeatures.auth).toBe(true);
            expect(nextjsConfig.supportedFeatures.storage).toBe(true);
            expect(nextjsConfig.supportedFeatures.deployment).toBe(true);
            expect(nextjsConfig.supportedFeatures.packageManager).toBe(true);
        });

        it('should have comprehensive database support', () => {
            expect(nextjsConfig.supportedDatabases).toEqual(['none', 'turso', 'supabase']);
        });

        it('should support both ORMs', () => {
            expect(nextjsConfig.supportedOrms).toEqual(['prisma', 'drizzle']);
        });

        it('should support all storage options', () => {
            expect(nextjsConfig.supportedStorage).toEqual([
                'none',
                'vercel-blob',
                'cloudflare-r2',
                'aws-s3',
                'supabase-storage',
            ]);
        });

        it('should have required React dependencies', () => {
            expect(nextjsConfig.requiredDependencies).toContain('next');
            expect(nextjsConfig.requiredDependencies).toContain('react');
            expect(nextjsConfig.requiredDependencies).toContain('react-dom');
        });

        it('should have TypeScript dev dependencies', () => {
            expect(nextjsConfig.devDependencies).toContain('typescript');
            expect(nextjsConfig.devDependencies).toContain('@types/node');
            expect(nextjsConfig.devDependencies).toContain('@types/react');
            expect(nextjsConfig.devDependencies).toContain('@types/react-dom');
        });

        it('should have version information for all required dependencies', () => {
            expect(nextjsConfig.versions).toHaveProperty('next');
            expect(nextjsConfig.versions).toHaveProperty('react');
            expect(nextjsConfig.versions).toHaveProperty('react-dom');
            expect(nextjsConfig.versions).toHaveProperty('typescript');
        });
    });

    describe('Expo configuration', () => {
        const expoConfig = FRAMEWORK_CONFIGS.expo;

        it('should have correct basic properties', () => {
            expect(expoConfig.name).toBe('expo');
            expect(expoConfig.displayName).toBe('Expo');
            expect(expoConfig.defaultName).toBe('my-expo-app');
            expect(expoConfig.description).toBe('React Native framework for mobile applications');
        });

        it('should support most features except deployment', () => {
            expect(expoConfig.supportedFeatures.database).toBe(true);
            expect(expoConfig.supportedFeatures.auth).toBe(true);
            expect(expoConfig.supportedFeatures.storage).toBe(true);
            expect(expoConfig.supportedFeatures.deployment).toBe(false);
            expect(expoConfig.supportedFeatures.packageManager).toBe(true);
        });

        it('should have database support', () => {
            expect(expoConfig.supportedDatabases).toEqual(['none', 'turso', 'supabase']);
        });

        it('should support both ORMs', () => {
            expect(expoConfig.supportedOrms).toEqual(['prisma', 'drizzle']);
        });

        it('should not support Vercel Blob storage', () => {
            expect(expoConfig.supportedStorage).not.toContain('vercel-blob');
            expect(expoConfig.supportedStorage).toEqual([
                'none',
                'cloudflare-r2',
                'aws-s3',
                'supabase-storage',
            ]);
        });

        it('should have Expo-specific dependencies', () => {
            expect(expoConfig.requiredDependencies).toContain('expo');
            expect(expoConfig.requiredDependencies).toContain('react-native');
            expect(expoConfig.requiredDependencies).toContain('expo-router');
        });
    });

    describe('Tauri configuration', () => {
        const tauriConfig = FRAMEWORK_CONFIGS.tauri;

        it('should have correct basic properties', () => {
            expect(tauriConfig.name).toBe('tauri');
            expect(tauriConfig.displayName).toBe('Tauri');
            expect(tauriConfig.defaultName).toBe('my-tauri-app');
            expect(tauriConfig.description).toBe(
                'Desktop applications with Rust backend and web frontend'
            );
        });

        it('should only support deployment and package manager features', () => {
            expect(tauriConfig.supportedFeatures.database).toBe(false);
            expect(tauriConfig.supportedFeatures.auth).toBe(false);
            expect(tauriConfig.supportedFeatures.storage).toBe(false);
            expect(tauriConfig.supportedFeatures.deployment).toBe(true);
            expect(tauriConfig.supportedFeatures.packageManager).toBe(true);
        });

        it('should only support none for database and storage', () => {
            expect(tauriConfig.supportedDatabases).toEqual(['none']);
            expect(tauriConfig.supportedOrms).toEqual([]);
            expect(tauriConfig.supportedStorage).toEqual(['none']);
        });

        it('should have Tauri-specific dependencies', () => {
            expect(tauriConfig.requiredDependencies).toContain('@tauri-apps/api');
            expect(tauriConfig.requiredDependencies).toContain('@tauri-apps/plugin-shell');
        });

        it('should have Vite dev dependencies', () => {
            expect(tauriConfig.devDependencies).toContain('vite');
            expect(tauriConfig.devDependencies).toContain('@vitejs/plugin-react');
        });
    });

    describe('Flutter configuration', () => {
        const flutterConfig = FRAMEWORK_CONFIGS.flutter;

        it('should have correct basic properties', () => {
            expect(flutterConfig.name).toBe('flutter');
            expect(flutterConfig.displayName).toBe('Flutter');
            expect(flutterConfig.defaultName).toBe('my_flutter_app');
            expect(flutterConfig.description).toBe('Cross-platform apps with Dart');
        });

        it('should only support deployment feature', () => {
            expect(flutterConfig.supportedFeatures.database).toBe(false);
            expect(flutterConfig.supportedFeatures.auth).toBe(false);
            expect(flutterConfig.supportedFeatures.storage).toBe(false);
            expect(flutterConfig.supportedFeatures.deployment).toBe(true);
            expect(flutterConfig.supportedFeatures.packageManager).toBe(false);
        });

        it('should only support none for database and storage', () => {
            expect(flutterConfig.supportedDatabases).toEqual(['none']);
            expect(flutterConfig.supportedOrms).toEqual([]);
            expect(flutterConfig.supportedStorage).toEqual(['none']);
        });

        it('should have minimal dependencies since Flutter has its own package manager', () => {
            expect(flutterConfig.requiredDependencies).toEqual([]);
            expect(flutterConfig.devDependencies).toEqual([]);
        });

        it('should have Flutter and Dart version constraints', () => {
            expect(flutterConfig.versions).toHaveProperty('flutter');
            expect(flutterConfig.versions).toHaveProperty('dart');
        });
    });

    describe('data validation', () => {
        it('should only contain valid database types', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                for (const database of config.supportedDatabases) {
                    expect(validDatabases).toContain(database);
                }
            }
        });

        it('should only contain valid ORM types', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                for (const orm of config.supportedOrms) {
                    expect(validOrms).toContain(orm);
                }
            }
        });

        it('should only contain valid storage types', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                for (const storage of config.supportedStorage) {
                    expect(validStorageTypes).toContain(storage);
                }
            }
        });

        it('should have non-empty strings for all text properties', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                expect(config.name.length).toBeGreaterThan(0);
                expect(config.displayName.length).toBeGreaterThan(0);
                expect(config.defaultName.length).toBeGreaterThan(0);
                expect(config.description.length).toBeGreaterThan(0);
            }
        });

        it('should have at least one supported database (none)', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                expect(config.supportedDatabases).toContain('none');
                expect(config.supportedDatabases.length).toBeGreaterThan(0);
            }
        });

        it('should have at least one supported storage (none)', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                expect(config.supportedStorage).toContain('none');
                expect(config.supportedStorage.length).toBeGreaterThan(0);
            }
        });
    });

    describe('feature consistency', () => {
        it('should not support ORMs if database feature is disabled', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                if (!config.supportedFeatures.database) {
                    expect(config.supportedOrms).toEqual([]);
                }
            }
        });

        it('should only support "none" database if database feature is disabled', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                if (!config.supportedFeatures.database) {
                    expect(config.supportedDatabases).toEqual(['none']);
                }
            }
        });

        it('should only support "none" storage if storage feature is disabled', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                if (!config.supportedFeatures.storage) {
                    expect(config.supportedStorage).toEqual(['none']);
                }
            }
        });
    });

    describe('version format validation', () => {
        it('should have valid version formats', () => {
            for (const [_frameworkName, config] of Object.entries(FRAMEWORK_CONFIGS)) {
                for (const [_packageName, version] of Object.entries(config.versions)) {
                    expect(typeof version).toBe('string');
                    expect(version.length).toBeGreaterThan(0);
                }
            }
        });
    });
});
