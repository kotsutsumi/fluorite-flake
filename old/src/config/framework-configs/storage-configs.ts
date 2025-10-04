/**
 * ストレージ設定定義
 * サポートされているストレージサービスの設定情報
 */

import type { FrameworkType, StorageType } from './types.js';

/**
 * ストレージ設定インターフェース
 * 各ストレージサービスの共通設定構造
 */
interface StorageConfig {
    name: string; // サービス名
    description: string; // サービスの説明
    envVars: string[]; // 必要な環境変数
    supportedFrameworks: FrameworkType[]; // 対応フレームワーク
}

/**
 * ストレージ設定マップ
 * 各ストレージサービスの詳細設定
 */
export const STORAGE_CONFIGS: Record<Exclude<StorageType, 'none'>, StorageConfig> = {
    // Vercel Blob 設定 - CDN付きシンプルファイルストレージ
    'vercel-blob': {
        name: 'Vercel Blob',
        description: 'CDN付きシンプルファイルストレージ',
        envVars: ['BLOB_READ_WRITE_TOKEN'], // 読み書き用トークン
        supportedFrameworks: ['nextjs'], // Next.jsのみ対応
    },
    // Cloudflare R2 設定 - S3互換オブジェクトストレージ
    'cloudflare-r2': {
        name: 'Cloudflare R2',
        description: 'S3互換オブジェクトストレージ',
        envVars: [
            // 必要な環境変数
            'CLOUDFLARE_R2_ACCOUNT_ID', // CloudflareアカウントID
            'CLOUDFLARE_R2_ACCESS_KEY_ID', // アクセスキーID
            'CLOUDFLARE_R2_SECRET_ACCESS_KEY', // シークレットアクセスキー
            'CLOUDFLARE_R2_BUCKET_NAME', // バケット名
        ],
        supportedFrameworks: ['nextjs', 'expo'], // Next.jsとExpo対応
    },
    // AWS S3 設定 - 業界標準オブジェクトストレージ
    'aws-s3': {
        name: 'AWS S3',
        description: '業界標準オブジェクトストレージ',
        envVars: [
            // 必要な環境変数
            'AWS_ACCESS_KEY_ID', // AWSアクセスキーID
            'AWS_SECRET_ACCESS_KEY', // AWSシークレットアクセスキー
            'AWS_REGION', // AWSリージョン
            'AWS_BUCKET_NAME', // S3バケット名
        ],
        supportedFrameworks: ['nextjs', 'expo'], // Next.jsとExpo対応
    },
    // Supabase Storage 設定 - Supabase認証/データベース統合ストレージ
    'supabase-storage': {
        name: 'Supabase Storage',
        description: 'Supabase認証/データベース統合ストレージ',
        envVars: [
            // 必要な環境変数
            'NEXT_PUBLIC_SUPABASE_URL', // SupabaseプロジェクトURL
            'NEXT_PUBLIC_SUPABASE_ANON_KEY', // 公開用匿名キー
        ],
        supportedFrameworks: ['nextjs', 'expo'], // Next.jsとExpo対応
    },
};
