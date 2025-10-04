/**
 * ストレージサービスごとの環境変数プレースホルダーを取得する関数
 * Vercelデプロイメント時に必要な環境変数のプレースホルダーを返す
 */

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * ストレージサービスごとの環境変数プレースホルダーを取得する関数
 * Vercelデプロイメント時に必要な環境変数のプレースホルダーを返す
 * @param storage ストレージサービスの種類
 * @returns 環境変数名とプレースホルダーのマッピング
 */
export function getStorageEnvPlaceholders(
    storage: ProjectConfig['storage']
): Record<string, string> {
    switch (storage) {
        case 'vercel-blob':
            return {
                BLOB_READ_WRITE_TOKEN: '@blob_read_write_token',
            };
        case 'aws-s3':
            return {
                AWS_REGION: '@aws_region',
                AWS_ACCESS_KEY_ID: '@aws_access_key_id',
                AWS_SECRET_ACCESS_KEY: '@aws_secret_access_key',
                S3_BUCKET_NAME: '@s3_bucket_name',
            };
        case 'cloudflare-r2':
            return {
                R2_ACCOUNT_ID: '@r2_account_id',
                R2_ACCESS_KEY_ID: '@r2_access_key_id',
                R2_SECRET_ACCESS_KEY: '@r2_secret_access_key',
                R2_BUCKET_NAME: '@r2_bucket_name',
                R2_PUBLIC_URL: '@r2_public_url',
            };
        case 'supabase-storage':
            return {
                NEXT_PUBLIC_SUPABASE_URL: '@supabase_url',
                NEXT_PUBLIC_SUPABASE_ANON_KEY: '@supabase_anon_key',
                SUPABASE_SERVICE_ROLE_KEY: '@supabase_service_role_key',
                SUPABASE_STORAGE_BUCKET: '@supabase_storage_bucket',
            };
        default:
            return {};
    }
}
