import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';
import { appendEnv } from './appendEnv.js';
import { writeStorageLib } from './writeStorageLib.js';

/**
 * Cloudflare R2ストレージの設定を行う関数
 * 環境変数とストレージライブラリを設定
 * @param config プロジェクト設定
 */
export async function setupCloudflareR2(config: ProjectConfig) {
    // Cloudflare R2の環境変数を追加
    await appendEnv(
        config.projectPath,
        `\n# Cloudflare R2\nR2_ACCOUNT_ID="[your-account-id]"\nR2_ACCESS_KEY_ID="[your-access-key]"\nR2_SECRET_ACCESS_KEY="[your-secret-key]"\nR2_BUCKET_NAME="[your-bucket-name]"\nR2_PUBLIC_URL="https://[your-public-url]"\nR2_CUSTOM_ENDPOINT=""\n`,
        config.framework
    );

    // テンプレートからCloudflare R2用ストレージライブラリを作成
    const storageContent = await readTemplate('storage/cloudflare-r2/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // Wrangler CLIの可用性をチェックしてガイダンスを提供
    // TODO: CLIアダプターが修正されたら有効化
    // await checkWranglerAvailability(config);
}
