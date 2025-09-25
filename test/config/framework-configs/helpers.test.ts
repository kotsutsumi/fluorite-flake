import { describe, expect, it } from 'vitest';

import {
    getFrameworkConfig,
    getSupportedDatabases,
    getSupportedStorage,
    supportsFeature,
    validateConfiguration,
} from '../../../src/config/framework-configs/helpers.js';
import type {
    DatabaseType,
    FrameworkFeatures,
    FrameworkType,
    OrmType,
    StorageType,
} from '../../../src/config/framework-configs/types.js';

describe('framework-configs helpers', () => {
    const validFrameworks: FrameworkType[] = ['nextjs', 'expo', 'tauri', 'flutter'];

    describe('getFrameworkConfig', () => {
        it('should return config for valid frameworks', () => {
            for (const framework of validFrameworks) {
                const config = getFrameworkConfig(framework);
                expect(config).toBeDefined();
                expect(config.name).toBe(framework);
                expect(typeof config.displayName).toBe('string');
                expect(typeof config.description).toBe('string');
            }
        });

        it('should return Next.js config with correct properties', () => {
            const config = getFrameworkConfig('nextjs');
            expect(config.name).toBe('nextjs');
            expect(config.displayName).toBe('Next.js');
            expect(config.supportedFeatures.database).toBe(true);
            expect(config.supportedFeatures.auth).toBe(true);
            expect(config.supportedFeatures.storage).toBe(true);
        });

        it('should return Expo config with correct properties', () => {
            const config = getFrameworkConfig('expo');
            expect(config.name).toBe('expo');
            expect(config.displayName).toBe('Expo');
            expect(config.supportedFeatures.database).toBe(true);
            expect(config.supportedFeatures.deployment).toBe(false);
        });

        it('should return Tauri config with limited features', () => {
            const config = getFrameworkConfig('tauri');
            expect(config.name).toBe('tauri');
            expect(config.displayName).toBe('Tauri');
            expect(config.supportedFeatures.database).toBe(false);
            expect(config.supportedFeatures.auth).toBe(false);
            expect(config.supportedFeatures.storage).toBe(false);
            expect(config.supportedFeatures.deployment).toBe(true);
        });

        it('should return Flutter config with minimal features', () => {
            const config = getFrameworkConfig('flutter');
            expect(config.name).toBe('flutter');
            expect(config.displayName).toBe('Flutter');
            expect(config.supportedFeatures.database).toBe(false);
            expect(config.supportedFeatures.packageManager).toBe(false);
            expect(config.supportedFeatures.deployment).toBe(true);
        });
    });

    describe('supportsFeature', () => {
        const features: (keyof FrameworkFeatures)[] = [
            'database',
            'auth',
            'storage',
            'deployment',
            'packageManager',
        ];

        it('should return boolean for all valid feature checks', () => {
            for (const framework of validFrameworks) {
                for (const feature of features) {
                    const result = supportsFeature(framework, feature);
                    expect(typeof result).toBe('boolean');
                }
            }
        });

        it('should correctly identify Next.js supported features', () => {
            expect(supportsFeature('nextjs', 'database')).toBe(true);
            expect(supportsFeature('nextjs', 'auth')).toBe(true);
            expect(supportsFeature('nextjs', 'storage')).toBe(true);
            expect(supportsFeature('nextjs', 'deployment')).toBe(true);
            expect(supportsFeature('nextjs', 'packageManager')).toBe(true);
        });

        it('should correctly identify Expo supported features', () => {
            expect(supportsFeature('expo', 'database')).toBe(true);
            expect(supportsFeature('expo', 'auth')).toBe(true);
            expect(supportsFeature('expo', 'storage')).toBe(true);
            expect(supportsFeature('expo', 'deployment')).toBe(false);
            expect(supportsFeature('expo', 'packageManager')).toBe(true);
        });

        it('should correctly identify Tauri supported features', () => {
            expect(supportsFeature('tauri', 'database')).toBe(false);
            expect(supportsFeature('tauri', 'auth')).toBe(false);
            expect(supportsFeature('tauri', 'storage')).toBe(false);
            expect(supportsFeature('tauri', 'deployment')).toBe(true);
            expect(supportsFeature('tauri', 'packageManager')).toBe(true);
        });

        it('should correctly identify Flutter supported features', () => {
            expect(supportsFeature('flutter', 'database')).toBe(false);
            expect(supportsFeature('flutter', 'auth')).toBe(false);
            expect(supportsFeature('flutter', 'storage')).toBe(false);
            expect(supportsFeature('flutter', 'deployment')).toBe(true);
            expect(supportsFeature('flutter', 'packageManager')).toBe(false);
        });
    });

    describe('getSupportedDatabases', () => {
        it('should return database arrays for all frameworks', () => {
            for (const framework of validFrameworks) {
                const databases = getSupportedDatabases(framework);
                expect(Array.isArray(databases)).toBe(true);
                expect(databases.length).toBeGreaterThan(0);
                expect(databases).toContain('none'); // All frameworks should support 'none'
            }
        });

        it('should return comprehensive database support for Next.js', () => {
            const databases = getSupportedDatabases('nextjs');
            expect(databases).toEqual(['none', 'turso', 'supabase']);
        });

        it('should return comprehensive database support for Expo', () => {
            const databases = getSupportedDatabases('expo');
            expect(databases).toEqual(['none', 'turso', 'supabase']);
        });

        it('should return only none for Tauri', () => {
            const databases = getSupportedDatabases('tauri');
            expect(databases).toEqual(['none']);
        });

        it('should return only none for Flutter', () => {
            const databases = getSupportedDatabases('flutter');
            expect(databases).toEqual(['none']);
        });

        it('should return valid database types only', () => {
            const validDatabases: DatabaseType[] = ['none', 'turso', 'supabase'];
            for (const framework of validFrameworks) {
                const databases = getSupportedDatabases(framework);
                for (const db of databases) {
                    expect(validDatabases).toContain(db);
                }
            }
        });
    });

    describe('getSupportedStorage', () => {
        it('should return storage arrays for all frameworks', () => {
            for (const framework of validFrameworks) {
                const storageTypes = getSupportedStorage(framework);
                expect(Array.isArray(storageTypes)).toBe(true);
                expect(storageTypes.length).toBeGreaterThan(0);
                expect(storageTypes).toContain('none'); // All frameworks should support 'none'
            }
        });

        it('should return comprehensive storage support for Next.js', () => {
            const storageTypes = getSupportedStorage('nextjs');
            expect(storageTypes).toEqual([
                'none',
                'vercel-blob',
                'cloudflare-r2',
                'aws-s3',
                'supabase-storage',
            ]);
        });

        it('should return limited storage support for Expo (no Vercel Blob)', () => {
            const storageTypes = getSupportedStorage('expo');
            expect(storageTypes).toEqual(['none', 'cloudflare-r2', 'aws-s3', 'supabase-storage']);
            expect(storageTypes).not.toContain('vercel-blob');
        });

        it('should return only none for Tauri', () => {
            const storageTypes = getSupportedStorage('tauri');
            expect(storageTypes).toEqual(['none']);
        });

        it('should return only none for Flutter', () => {
            const storageTypes = getSupportedStorage('flutter');
            expect(storageTypes).toEqual(['none']);
        });

        it('should return valid storage types only', () => {
            const validStorageTypes: StorageType[] = [
                'none',
                'vercel-blob',
                'cloudflare-r2',
                'aws-s3',
                'supabase-storage',
            ];
            for (const framework of validFrameworks) {
                const storageTypes = getSupportedStorage(framework);
                for (const storage of storageTypes) {
                    expect(validStorageTypes).toContain(storage);
                }
            }
        });
    });

    describe('validateConfiguration', () => {
        describe('valid configurations', () => {
            it('should validate Next.js with no database or storage', () => {
                const result = validateConfiguration({
                    framework: 'nextjs',
                    database: 'none',
                    storage: 'none',
                });
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate Next.js with Turso and Prisma', () => {
                const result = validateConfiguration({
                    framework: 'nextjs',
                    database: 'turso',
                    orm: 'prisma',
                    storage: 'vercel-blob',
                });
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate Expo with Supabase and Drizzle', () => {
                const result = validateConfiguration({
                    framework: 'expo',
                    database: 'supabase',
                    orm: 'drizzle',
                    storage: 'aws-s3',
                });
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate Tauri with minimal config', () => {
                const result = validateConfiguration({
                    framework: 'tauri',
                    database: 'none',
                    storage: 'none',
                });
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate Flutter with minimal config', () => {
                const result = validateConfiguration({
                    framework: 'flutter',
                    database: 'none',
                    storage: 'none',
                });
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        describe('invalid database configurations', () => {
            it('should reject unsupported database for Tauri', () => {
                const result = validateConfiguration({
                    framework: 'tauri',
                    database: 'turso',
                    storage: 'none',
                });
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Tauri does not support turso database');
            });

            it('should reject unsupported database for Flutter', () => {
                const result = validateConfiguration({
                    framework: 'flutter',
                    database: 'supabase',
                    storage: 'none',
                });
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Flutter does not support supabase database');
            });
        });

        describe('invalid ORM configurations', () => {
            it('should accept valid ORM for supported database', () => {
                const result = validateConfiguration({
                    framework: 'nextjs',
                    database: 'turso',
                    orm: 'prisma',
                    storage: 'none',
                });
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should handle ORM validation for none database', () => {
                const result = validateConfiguration({
                    framework: 'nextjs',
                    database: 'none',
                    orm: 'prisma',
                    storage: 'none',
                });
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        describe('invalid storage configurations', () => {
            it('should reject Vercel Blob for Expo', () => {
                const result = validateConfiguration({
                    framework: 'expo',
                    database: 'none',
                    storage: 'vercel-blob',
                });
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Expo does not support vercel-blob storage');
            });

            it('should reject any storage for Tauri except none', () => {
                const result = validateConfiguration({
                    framework: 'tauri',
                    database: 'none',
                    storage: 'aws-s3',
                });
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Tauri does not support aws-s3 storage');
            });

            it('should reject any storage for Flutter except none', () => {
                const result = validateConfiguration({
                    framework: 'flutter',
                    database: 'none',
                    storage: 'supabase-storage',
                });
                expect(result.valid).toBe(false);
                expect(result.errors).toContain(
                    'Flutter does not support supabase-storage storage'
                );
            });
        });

        describe('multiple validation errors', () => {
            it('should collect all validation errors', () => {
                const result = validateConfiguration({
                    framework: 'tauri',
                    database: 'turso',
                    storage: 'vercel-blob',
                });
                expect(result.valid).toBe(false);
                expect(result.errors).toHaveLength(2);
                expect(result.errors).toContain('Tauri does not support turso database');
                expect(result.errors).toContain('Tauri does not support vercel-blob storage');
            });
        });

        describe('edge cases', () => {
            it('should handle configuration without ORM', () => {
                const result = validateConfiguration({
                    framework: 'nextjs',
                    database: 'turso',
                    storage: 'none',
                });
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });
    });
});
