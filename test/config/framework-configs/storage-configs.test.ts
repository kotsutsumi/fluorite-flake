import { describe, expect, it } from 'vitest';

import { STORAGE_CONFIGS } from '../../../src/config/framework-configs/storage-configs.js';
import type { FrameworkType, StorageType } from '../../../src/config/framework-configs/types.js';

describe('STORAGE_CONFIGS', () => {
    const storageTypes: Exclude<StorageType, 'none'>[] = [
        'vercel-blob',
        'cloudflare-r2',
        'aws-s3',
        'supabase-storage',
    ];
    const validFrameworks: FrameworkType[] = ['nextjs', 'expo', 'tauri', 'flutter'];

    describe('storage configs structure', () => {
        it('should have all expected storage configurations', () => {
            expect(STORAGE_CONFIGS).toHaveProperty('vercel-blob');
            expect(STORAGE_CONFIGS).toHaveProperty('cloudflare-r2');
            expect(STORAGE_CONFIGS).toHaveProperty('aws-s3');
            expect(STORAGE_CONFIGS).toHaveProperty('supabase-storage');
        });

        it('should have exactly 4 storage configurations', () => {
            expect(Object.keys(STORAGE_CONFIGS)).toHaveLength(4);
        });

        it('should have consistent structure for all storage configs', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                expect(config).toHaveProperty('name');
                expect(config).toHaveProperty('description');
                expect(config).toHaveProperty('envVars');
                expect(config).toHaveProperty('supportedFrameworks');

                expect(typeof config.name).toBe('string');
                expect(typeof config.description).toBe('string');
                expect(Array.isArray(config.envVars)).toBe(true);
                expect(Array.isArray(config.supportedFrameworks)).toBe(true);

                expect(config.name.length).toBeGreaterThan(0);
                expect(config.description.length).toBeGreaterThan(0);
                expect(config.envVars.length).toBeGreaterThan(0);
                expect(config.supportedFrameworks.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Vercel Blob configuration', () => {
        const vercelBlobConfig = STORAGE_CONFIGS['vercel-blob'];

        it('should have correct name and description', () => {
            expect(vercelBlobConfig.name).toBe('Vercel Blob');
            expect(vercelBlobConfig.description).toBe('Simple file storage with CDN');
        });

        it('should have required environment variables', () => {
            expect(vercelBlobConfig.envVars).toEqual(['BLOB_READ_WRITE_TOKEN']);
        });

        it('should only support Next.js framework', () => {
            expect(vercelBlobConfig.supportedFrameworks).toEqual(['nextjs']);
        });

        it('should have minimal environment variables', () => {
            expect(vercelBlobConfig.envVars).toHaveLength(1);
        });
    });

    describe('Cloudflare R2 configuration', () => {
        const cloudflareR2Config = STORAGE_CONFIGS['cloudflare-r2'];

        it('should have correct name and description', () => {
            expect(cloudflareR2Config.name).toBe('Cloudflare R2');
            expect(cloudflareR2Config.description).toBe('S3-compatible object storage');
        });

        it('should have all required Cloudflare R2 environment variables', () => {
            const expectedEnvVars = [
                'CLOUDFLARE_R2_ACCOUNT_ID',
                'CLOUDFLARE_R2_ACCESS_KEY_ID',
                'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
                'CLOUDFLARE_R2_BUCKET_NAME',
            ];
            expect(cloudflareR2Config.envVars).toEqual(expectedEnvVars);
        });

        it('should support Next.js and Expo frameworks', () => {
            expect(cloudflareR2Config.supportedFrameworks).toEqual(['nextjs', 'expo']);
        });

        it('should have comprehensive environment variables', () => {
            expect(cloudflareR2Config.envVars).toHaveLength(4);
        });
    });

    describe('AWS S3 configuration', () => {
        const awsS3Config = STORAGE_CONFIGS['aws-s3'];

        it('should have correct name and description', () => {
            expect(awsS3Config.name).toBe('AWS S3');
            expect(awsS3Config.description).toBe('Industry-standard object storage');
        });

        it('should have all required AWS S3 environment variables', () => {
            const expectedEnvVars = [
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY',
                'AWS_REGION',
                'AWS_BUCKET_NAME',
            ];
            expect(awsS3Config.envVars).toEqual(expectedEnvVars);
        });

        it('should support Next.js and Expo frameworks', () => {
            expect(awsS3Config.supportedFrameworks).toEqual(['nextjs', 'expo']);
        });

        it('should have standard AWS environment variables', () => {
            expect(awsS3Config.envVars).toHaveLength(4);
        });
    });

    describe('Supabase Storage configuration', () => {
        const supabaseStorageConfig = STORAGE_CONFIGS['supabase-storage'];

        it('should have correct name and description', () => {
            expect(supabaseStorageConfig.name).toBe('Supabase Storage');
            expect(supabaseStorageConfig.description).toBe(
                'Integrated with Supabase auth/database'
            );
        });

        it('should have Supabase-specific environment variables', () => {
            const expectedEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
            expect(supabaseStorageConfig.envVars).toEqual(expectedEnvVars);
        });

        it('should support Next.js and Expo frameworks', () => {
            expect(supabaseStorageConfig.supportedFrameworks).toEqual(['nextjs', 'expo']);
        });

        it('should have minimal Supabase environment variables', () => {
            expect(supabaseStorageConfig.envVars).toHaveLength(2);
        });
    });

    describe('framework support validation', () => {
        it('should only contain valid framework types', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                for (const framework of config.supportedFrameworks) {
                    expect(validFrameworks).toContain(framework);
                }
            }
        });

        it('should have Next.js support the most storage options', () => {
            const nextjsSupportedStorage = Object.entries(STORAGE_CONFIGS)
                .filter(([_, config]) => config.supportedFrameworks.includes('nextjs'))
                .map(([storageType, _]) => storageType);

            expect(nextjsSupportedStorage).toHaveLength(4);
            expect(nextjsSupportedStorage).toContain('vercel-blob');
            expect(nextjsSupportedStorage).toContain('cloudflare-r2');
            expect(nextjsSupportedStorage).toContain('aws-s3');
            expect(nextjsSupportedStorage).toContain('supabase-storage');
        });

        it('should have Expo support multiple storage options except Vercel Blob', () => {
            const expoSupportedStorage = Object.entries(STORAGE_CONFIGS)
                .filter(([_, config]) => config.supportedFrameworks.includes('expo'))
                .map(([storageType, _]) => storageType);

            expect(expoSupportedStorage).toHaveLength(3);
            expect(expoSupportedStorage).not.toContain('vercel-blob');
            expect(expoSupportedStorage).toContain('cloudflare-r2');
            expect(expoSupportedStorage).toContain('aws-s3');
            expect(expoSupportedStorage).toContain('supabase-storage');
        });

        it('should have Tauri and Flutter not support any storage', () => {
            const tauriSupportedStorage = Object.entries(STORAGE_CONFIGS).filter(([_, config]) =>
                config.supportedFrameworks.includes('tauri')
            );
            const flutterSupportedStorage = Object.entries(STORAGE_CONFIGS).filter(([_, config]) =>
                config.supportedFrameworks.includes('flutter')
            );

            expect(tauriSupportedStorage).toHaveLength(0);
            expect(flutterSupportedStorage).toHaveLength(0);
        });

        it('should have each storage supported by at least one framework', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                expect(config.supportedFrameworks.length).toBeGreaterThan(0);
            }
        });
    });

    describe('environment variables validation', () => {
        it('should not have empty environment variable names', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                for (const envVar of config.envVars) {
                    expect(envVar.trim()).toBe(envVar);
                    expect(envVar.length).toBeGreaterThan(0);
                }
            }
        });

        it('should have unique environment variable names per storage type', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                const uniqueEnvVars = [...new Set(config.envVars)];
                expect(config.envVars).toHaveLength(uniqueEnvVars.length);
            }
        });

        it('should have logical environment variable patterns', () => {
            // Vercel Blob should have BLOB_ prefixed vars
            expect(STORAGE_CONFIGS['vercel-blob'].envVars[0]).toMatch(/^BLOB_/);

            // Cloudflare R2 should have CLOUDFLARE_R2_ prefixed vars
            for (const envVar of STORAGE_CONFIGS['cloudflare-r2'].envVars) {
                expect(envVar).toMatch(/^CLOUDFLARE_R2_/);
            }

            // AWS S3 should have AWS_ prefixed vars
            for (const envVar of STORAGE_CONFIGS['aws-s3'].envVars) {
                expect(envVar).toMatch(/^AWS_/);
            }

            // Supabase should have SUPABASE related vars
            for (const envVar of STORAGE_CONFIGS['supabase-storage'].envVars) {
                expect(envVar).toMatch(/(SUPABASE|NEXT_PUBLIC_SUPABASE)/);
            }
        });
    });

    describe('storage provider characteristics', () => {
        it('should have Vercel Blob as Next.js specific solution', () => {
            const vercelBlob = STORAGE_CONFIGS['vercel-blob'];
            expect(vercelBlob.supportedFrameworks).toEqual(['nextjs']);
            expect(vercelBlob.envVars).toHaveLength(1); // Simplest setup
        });

        it('should have cloud providers support multiple frameworks', () => {
            const cloudProviders = ['cloudflare-r2', 'aws-s3', 'supabase-storage'] as const;
            for (const provider of cloudProviders) {
                const config = STORAGE_CONFIGS[provider];
                expect(config.supportedFrameworks.length).toBeGreaterThan(1);
            }
        });

        it('should have consistent naming patterns', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                // Name should not include hyphens (display name)
                expect(config.name).not.toMatch(/-/);
                // Description should be a proper sentence
                expect(config.description.length).toBeGreaterThan(10);
            }
        });
    });

    describe('completeness validation', () => {
        it('should cover all major storage providers', () => {
            const providerCategories = {
                vercel: 'vercel-blob',
                cloudflare: 'cloudflare-r2',
                aws: 'aws-s3',
                supabase: 'supabase-storage',
            };

            for (const [_category, storageType] of Object.entries(providerCategories)) {
                expect(STORAGE_CONFIGS).toHaveProperty(storageType);
            }
        });

        it('should have storage types match the StorageType excluding none', () => {
            const configKeys = Object.keys(STORAGE_CONFIGS);
            expect(configKeys).toEqual(expect.arrayContaining(storageTypes));
            expect(configKeys).toHaveLength(storageTypes.length);
        });
    });
});
