import type { ProjectConfig } from '../../commands/create/types.js';
import { createStorageApiRoutes } from './helpers/createStorageApiRoutes.js';
import { createUploadComponent } from './helpers/createUploadComponent.js';
import { setupAwsS3 } from './helpers/setupAwsS3.js';
import { setupCloudflareR2 } from './helpers/setupCloudflareR2.js';
import { setupSupabaseStorage } from './helpers/setupSupabaseStorage.js';
import { setupVercelBlob } from './helpers/setupVercelBlob.js';

/**
 * ストレージ設定を行うメイン関数
 * 指定されたストレージプロバイダーに応じて設定ファイルやAPIルートを生成
 * @param config プロジェクト設定
 */
export async function setupStorage(config: ProjectConfig) {
    if (config.storage === 'none') {
        return;
    }

    // ストレージプロバイダーごとの設定を実行
    switch (config.storage) {
        case 'vercel-blob':
            await setupVercelBlob(config);
            break;
        case 'aws-s3':
            await setupAwsS3(config);
            break;
        case 'cloudflare-r2':
            await setupCloudflareR2(config);
            break;
        case 'supabase-storage':
            await setupSupabaseStorage(config);
            break;
        default:
            break;
    }

    // 共通のAPIルートとアップロードコンポーネントを作成
    await createStorageApiRoutes(config);
    await createUploadComponent(config);
}
