/**
 * `STORAGE_CONFIGS` に定義された各ストレージ設定の完全性と整合性を検証するユニットテスト。
 * CLI が提示するストレージ選択肢の表示名・説明文・要求される環境変数・対応フレームワークが
 * ドキュメントやテンプレートの前提と矛盾しないかを網羅的に確認し、設定追加や文言変更に伴う
 * 想定外の破壊的変更を早期に検知することを目的としている。
 */
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
        // CLI の選択肢として想定している 4 種類のストレージ識別子が欠けていないかを検証する
        it('should have all expected storage configurations', () => {
            expect(STORAGE_CONFIGS).toHaveProperty('vercel-blob');
            expect(STORAGE_CONFIGS).toHaveProperty('cloudflare-r2');
            expect(STORAGE_CONFIGS).toHaveProperty('aws-s3');
            expect(STORAGE_CONFIGS).toHaveProperty('supabase-storage');
        });

        // 定義済みストレージ数が増減していないことを数で検知し、メンテナンス漏れを防ぐ
        it('should have exactly 4 storage configurations', () => {
            expect(Object.keys(STORAGE_CONFIGS)).toHaveLength(4);
        });

        // 各ストレージ設定が必須プロパティと型を一貫して保持しているかを確認する
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

        // CLI で表示される名称と説明文が仕様どおりであることを検証し、翻訳ミスを検知する
        it('should have correct name and description', () => {
            expect(vercelBlobConfig.name).toBe('Vercel Blob');
            expect(vercelBlobConfig.description).toBe('CDN付きシンプルファイルストレージ');
        });

        // 必要な環境変数が 1 つのトークンに限定されていることを確認し、テンプレートとの不整合を防止する
        it('should have required environment variables', () => {
            expect(vercelBlobConfig.envVars).toEqual(['BLOB_READ_WRITE_TOKEN']);
        });

        // Vercel Blob が Next.js 専用オプションとして扱われていることを保証する
        it('should only support Next.js framework', () => {
            expect(vercelBlobConfig.supportedFrameworks).toEqual(['nextjs']);
        });

        // Next.js の最小構成として 1 つの環境変数だけを要求することを担保する
        it('should have minimal environment variables', () => {
            expect(vercelBlobConfig.envVars).toHaveLength(1);
        });
    });

    describe('Cloudflare R2 configuration', () => {
        const cloudflareR2Config = STORAGE_CONFIGS['cloudflare-r2'];

        // 表示名と説明が Cloudflare R2 の提供内容を正しく伝えているかチェックする
        it('should have correct name and description', () => {
            expect(cloudflareR2Config.name).toBe('Cloudflare R2');
            expect(cloudflareR2Config.description).toBe('S3互換オブジェクトストレージ');
        });

        // R2 の接続に必要な認証情報が網羅されているかを環境変数一覧で検証する
        it('should have all required Cloudflare R2 environment variables', () => {
            const expectedEnvVars = [
                'CLOUDFLARE_R2_ACCOUNT_ID',
                'CLOUDFLARE_R2_ACCESS_KEY_ID',
                'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
                'CLOUDFLARE_R2_BUCKET_NAME',
            ];
            expect(cloudflareR2Config.envVars).toEqual(expectedEnvVars);
        });

        // Next.js と Expo の双方で利用可能な設定になっているか確認する
        it('should support Next.js and Expo frameworks', () => {
            expect(cloudflareR2Config.supportedFrameworks).toEqual(['nextjs', 'expo']);
        });

        // 必要な環境変数数が 4 件で維持されているかをチェックし、漏れや冗長な追加を防止する
        it('should have comprehensive environment variables', () => {
            expect(cloudflareR2Config.envVars).toHaveLength(4);
        });
    });

    describe('AWS S3 configuration', () => {
        const awsS3Config = STORAGE_CONFIGS['aws-s3'];

        // 表示名と説明文が AWS S3 を示すシンプルな文言になっているかを確認する
        it('should have correct name and description', () => {
            expect(awsS3Config.name).toBe('AWS S3');
            expect(awsS3Config.description).toBe('業界標準オブジェクトストレージ');
        });

        // AWS SDK 利用時に最低限必要となる認証情報が揃っているか検証する
        it('should have all required AWS S3 environment variables', () => {
            const expectedEnvVars = [
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY',
                'AWS_REGION',
                'AWS_BUCKET_NAME',
            ];
            expect(awsS3Config.envVars).toEqual(expectedEnvVars);
        });

        // Next.js と Expo の両方で AWS S3 が選択可能であることを証明する
        it('should support Next.js and Expo frameworks', () => {
            expect(awsS3Config.supportedFrameworks).toEqual(['nextjs', 'expo']);
        });

        // AWS S3 の環境変数が 4 件で固定されていることを確認し、追加の必要性を検討できるようにする
        it('should have standard AWS environment variables', () => {
            expect(awsS3Config.envVars).toHaveLength(4);
        });
    });

    describe('Supabase Storage configuration', () => {
        const supabaseStorageConfig = STORAGE_CONFIGS['supabase-storage'];

        // Supabase の名称と説明文がテンプレート出力と一致するかをチェックする
        it('should have correct name and description', () => {
            expect(supabaseStorageConfig.name).toBe('Supabase Storage');
            expect(supabaseStorageConfig.description).toBe(
                'Supabase認証/データベース統合ストレージ'
            );
        });

        // Supabase のフロントエンド・サーバー双方で必要となるキーが揃っているか確認する
        it('should have Supabase-specific environment variables', () => {
            const expectedEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
            expect(supabaseStorageConfig.envVars).toEqual(expectedEnvVars);
        });

        // Next.js と Expo の両方で Supabase が利用できることを保証する
        it('should support Next.js and Expo frameworks', () => {
            expect(supabaseStorageConfig.supportedFrameworks).toEqual(['nextjs', 'expo']);
        });

        // Supabase のセットアップが 2 つの公開キーのみで完結することを明示的に確かめる
        it('should have minimal Supabase environment variables', () => {
            expect(supabaseStorageConfig.envVars).toHaveLength(2);
        });
    });

    describe('framework support validation', () => {
        // 定義されたフレームワーク種別が型で許可された値の範囲に収まっているか確認する
        it('should only contain valid framework types', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                for (const framework of config.supportedFrameworks) {
                    expect(validFrameworks).toContain(framework);
                }
            }
        });

        // Next.js がすべてのストレージオプションを利用できる前提が守られているか検証する
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

        // Expo が利用可能なストレージから Vercel Blob が除外されている前提を確認する
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

        // Tauri と Flutter は現時点でクラウドストレージをサポートしない前提をテストする
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

        // どのストレージ設定も少なくとも一つのフレームワークで利用できることを保証する
        it('should have each storage supported by at least one framework', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                expect(config.supportedFrameworks.length).toBeGreaterThan(0);
            }
        });
    });

    describe('environment variables validation', () => {
        // 各環境変数名に余分な空白がなく、値が空文字列ではないことをチェックする
        it('should not have empty environment variable names', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                for (const envVar of config.envVars) {
                    expect(envVar.trim()).toBe(envVar);
                    expect(envVar.length).toBeGreaterThan(0);
                }
            }
        });

        // 同一ストレージ内で環境変数名が重複していないことを確認し、テンプレート出力の衝突を防ぐ
        it('should have unique environment variable names per storage type', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                const uniqueEnvVars = [...new Set(config.envVars)];
                expect(config.envVars).toHaveLength(uniqueEnvVars.length);
            }
        });

        // プロバイダーごとに想定されるプレフィックス・名称規則が守られているかを検証する
        it('should have logical environment variable patterns', () => {
            // Vercel Blob の環境変数が BLOB_ で始まる命名規則を維持しているか確認する
            expect(STORAGE_CONFIGS['vercel-blob'].envVars[0]).toMatch(/^BLOB_/);

            // Cloudflare R2 の環境変数が CLOUDFLARE_R2_ プレフィックスで統一されているか確認する
            for (const envVar of STORAGE_CONFIGS['cloudflare-r2'].envVars) {
                expect(envVar).toMatch(/^CLOUDFLARE_R2_/);
            }

            // AWS S3 の環境変数が AWS_ プレフィックスで始まる命名規則を守っているか確認する
            for (const envVar of STORAGE_CONFIGS['aws-s3'].envVars) {
                expect(envVar).toMatch(/^AWS_/);
            }

            // Supabase の環境変数が Supabase 関連のキー名になっているか正規表現で保証する
            for (const envVar of STORAGE_CONFIGS['supabase-storage'].envVars) {
                expect(envVar).toMatch(/(SUPABASE|NEXT_PUBLIC_SUPABASE)/);
            }
        });
    });

    describe('storage provider characteristics', () => {
        // Vercel Blob が Next.js 専用であり、設定項目がシンプルであることを明示的に確認する
        it('should have Vercel Blob as Next.js specific solution', () => {
            const vercelBlob = STORAGE_CONFIGS['vercel-blob'];
            expect(vercelBlob.supportedFrameworks).toEqual(['nextjs']);
            expect(vercelBlob.envVars).toHaveLength(1);
        });

        // クラウド系のストレージは複数フレームワークで共有される前提をチェックする
        it('should have cloud providers support multiple frameworks', () => {
            const cloudProviders = ['cloudflare-r2', 'aws-s3', 'supabase-storage'] as const;
            for (const provider of cloudProviders) {
                const config = STORAGE_CONFIGS[provider];
                expect(config.supportedFrameworks.length).toBeGreaterThan(1);
            }
        });

        // 表示名にハイフンが含まれず、説明文が十分な長さを持つといった UI 文言の品質を検査する
        it('should have consistent naming patterns', () => {
            for (const [_storageType, config] of Object.entries(STORAGE_CONFIGS)) {
                expect(config.name).not.toMatch(/-/);
                expect(config.description.length).toBeGreaterThan(10);
            }
        });
    });

    describe('completeness validation', () => {
        // 主要ストレージカテゴリに対応する設定がすべて存在することを確認する
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

        // 定義済みキーが StorageType (none を除く) と一致していることを比較で保証する
        it('should have storage types match the StorageType excluding none', () => {
            const configKeys = Object.keys(STORAGE_CONFIGS);
            expect(configKeys).toEqual(expect.arrayContaining(storageTypes));
            expect(configKeys).toHaveLength(storageTypes.length);
        });
    });
});
