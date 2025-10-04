import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';
import { appendEnv } from './appendEnv.js';
import { writeStorageLib } from './writeStorageLib.js';

/**
 * AWS S3ストレージの設定を行う関数
 * 環境変数とストレージライブラリを設定
 * @param config プロジェクト設定
 */
export async function setupAwsS3(config: ProjectConfig) {
    // AWS S3の環境変数を追加
    await appendEnv(
        config.projectPath,
        `\n# AWS S3\nAWS_REGION="us-east-1"\nAWS_ACCESS_KEY_ID="[your-access-key]"\nAWS_SECRET_ACCESS_KEY="[your-secret-key]"\nS3_BUCKET_NAME="[your-bucket-name]"\nAWS_S3_PUBLIC_URL="https://[your-bucket-name].s3.amazonaws.com"\n`,
        config.framework
    );

    // テンプレートからAWS S3用ストレージライブラリを作成
    const storageContent = await readTemplate('storage/aws-s3/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // AWS CLIの可用性をチェックしてガイダンスを提供
    // TODO: CLIアダプターが修正されたら有効化
    // await checkAwsAvailability(config);
}
