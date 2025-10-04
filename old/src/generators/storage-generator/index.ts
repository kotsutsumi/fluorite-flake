/**
 * ストレージジェネレーター
 * 様々なストレージプロバイダー（Vercel Blob、AWS S3、Cloudflare R2、Supabase Storage）の
 * 設定とAPIルート生成を行う統合ジェネレーター
 */

// メイン関数
export { setupStorage } from './setupStorage.js';

// 定数
export { ENV_TARGET_FILES } from './constants/envTargetFiles.js';

// ヘルパー関数
export { appendEnv } from './helpers/appendEnv.js';
export { createStorageApiRoutes } from './helpers/createStorageApiRoutes.js';
export { createUploadComponent } from './helpers/createUploadComponent.js';
export { ensureSupabaseClient } from './helpers/ensureSupabaseClient.js';
export { setupAwsS3 } from './helpers/setupAwsS3.js';
export { setupCloudflareR2 } from './helpers/setupCloudflareR2.js';
export { setupSupabaseStorage } from './helpers/setupSupabaseStorage.js';
export { setupVercelBlob } from './helpers/setupVercelBlob.js';
export { writeStorageLib } from './helpers/writeStorageLib.js';
