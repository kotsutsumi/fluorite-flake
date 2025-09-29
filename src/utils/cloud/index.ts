/**
 * クラウドプロビジョニングのメインエントリポイント
 * クラウドリソースの作成、環境変数の設定、レコード管理を行います
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create/types.js';
import { upsertEnvFile } from '../env-file.js';
import { CLIProvisioner } from './cli-provisioner.js';
import { MockProvisioner } from './mock-provisioner.js';
import type {
    CloudProvisioner,
    CloudProvisioningRecord,
    SupabaseDatabaseRecord,
    TursoDatabaseRecord,
} from './types.js';

/** プロビジョニングレコードのファイル名 */
export const PROVISIONING_FILENAME = 'fluorite-cloud.json';

/**
 * 自動プロビジョニングが有効かどうか
 * 環境変数FLUORITE_AUTO_PROVISIONで制御（デフォルト: true）
 */
const AUTO_PROVISION_ENABLED = ['true', '1', 'on'].includes(
    String(process.env.FLUORITE_AUTO_PROVISION ?? 'true').toLowerCase()
);

/**
 * プロジェクト設定に基づいてプロビジョニングが必要かどうかを判定します
 * @param config プロジェクトの設定
 * @returns プロビジョニングが必要な場合はtrue
 */
function shouldProvision(config: ProjectConfig): boolean {
    // 自動プロビジョニングが無効またはNext.js以外の場合はスキップ
    if (!AUTO_PROVISION_ENABLED || config.framework !== 'nextjs') {
        return false;
    }

    // データベースが必要かどうか
    const wantsDatabase = config.database === 'turso' || config.database === 'supabase';
    // ストレージが必要かどうか
    const wantsStorage =
        config.storage === 'vercel-blob' ||
        config.storage === 'cloudflare-r2' ||
        config.storage === 'aws-s3' ||
        config.storage === 'supabase-storage';

    return wantsDatabase || wantsStorage || config.deployment === true;
}

/**
 * プロジェクトがプロビジョニングの対象かどうかをチェックします
 * @param config プロジェクトの設定
 * @returns プロビジョニング対象の場合はtrue
 */
export function isProvisioningEligible(config: ProjectConfig): boolean {
    return shouldProvision(config);
}

/**
 * 環境変数や実行環境に基づいて適切なプロビジョナーを選択します
 * @returns 選択されたプロビジョナーインスタンス
 */
function resolveProvisioner(): CloudProvisioner {
    const forcedMode = process.env.FLUORITE_CLOUD_MODE?.toLowerCase();

    // 明示的にモックモードが指定された場合
    if (forcedMode === 'mock') {
        return new MockProvisioner();
    }

    // 明示的に実際のCLIモードが指定された場合
    if (forcedMode === 'real' || forcedMode === 'cli') {
        return new CLIProvisioner();
    }

    // テスト環境ではモックプロビジョナーを使用
    if (process.env.NODE_ENV === 'test') {
        return new MockProvisioner();
    }

    // デフォルトは自動リソース作成のためCLIプロビジョナーを使用
    return new CLIProvisioner();
}

/**
 * クラウドリソースをプロビジョニングし、環境変数を設定します
 * @param config プロジェクトの設定
 * @returns プロビジョニングレコード、プロビジョニングが不要な場合はnull
 */
export async function provisionCloudResources(
    config: ProjectConfig
): Promise<CloudProvisioningRecord | null> {
    // プロビジョニングが不要な場合はスキップ
    if (!shouldProvision(config)) {
        return null;
    }

    // プロビジョナーを選択してリソースを作成
    const provisioner = resolveProvisioner();
    const record = await provisioner.provision(config);
    // プロビジョニングレコードをファイルに保存
    await writeProvisioningRecord(config.projectPath, record);
    // 環境変数ファイルを更新
    await applyEnvUpdates(config, record);
    return record;
}

/**
 * プロビジョニングレコードをJSONファイルとして保存します
 * @param projectPath プロジェクトのパス
 * @param record 保存するプロビジョニングレコード
 */
async function writeProvisioningRecord(projectPath: string, record: CloudProvisioningRecord) {
    const targetPath = path.join(projectPath, PROVISIONING_FILENAME);
    await fs.writeJSON(targetPath, record, { spaces: 2 });
}

/**
 * プロビジョニングレコードに基づいて環境変数ファイルを更新します
 * @param config プロジェクトの設定
 * @param record プロビジョニングレコード
 */
async function applyEnvUpdates(config: ProjectConfig, record: CloudProvisioningRecord) {
    // Tursoデータベースの処理
    const devTursoDatabase = record.turso?.databases.find((item) => item.env === 'dev');
    const stgTursoDatabase = record.turso?.databases.find((item) => item.env === 'stg');
    const prodTursoDatabase = record.turso?.databases.find((item) => item.env === 'prod');

    // Supabaseデータベースの処理
    const devSupabaseDb = record.supabase?.databases.find((item) => item.env === 'dev');
    const stgSupabaseDb = record.supabase?.databases.find((item) => item.env === 'stg');
    const prodSupabaseDb = record.supabase?.databases.find((item) => item.env === 'prod');

    /**
     * Tursoデータベースの接続情報を環境変数形式で生成します
     */
    const connectionForTurso = (database?: TursoDatabaseRecord) => {
        const result: Record<string, string> = {};
        if (!database) {
            return result;
        }

        result.DATABASE_URL = `${database.databaseUrl}?authToken=${database.authToken}`;
        result.TURSO_DATABASE_URL = database.databaseUrl;
        result.TURSO_AUTH_TOKEN = database.authToken;

        return result;
    };

    /**
     * Supabaseデータベースの接続情報を環境変数形式で生成します
     */
    const connectionForSupabase = (database?: SupabaseDatabaseRecord) => {
        const result: Record<string, string> = {};
        if (!database) {
            return result;
        }

        result.DATABASE_URL = database.databaseUrl;
        result.SUPABASE_DB_PASSWORD = database.dbPassword ?? '';
        result.NEXT_PUBLIC_SUPABASE_URL =
            database.apiUrl ?? `https://${database.projectRef}.supabase.co`;
        result.NEXT_PUBLIC_SUPABASE_ANON_KEY = database.anonKey;
        result.SUPABASE_SERVICE_ROLE_KEY = database.serviceRoleKey;

        return result;
    };

    /**
     * ストレージサービスの環境変数を生成します
     */
    const storageEnvs = () => {
        const envs: Record<string, string> = {};

        // Vercel Blobストレージの設定
        if (record.vercelBlob?.readWriteToken) {
            envs.BLOB_READ_WRITE_TOKEN = record.vercelBlob.readWriteToken;
        }

        // Cloudflare R2ストレージの設定
        if (record.cloudflareR2) {
            envs.R2_BUCKET_NAME = record.cloudflareR2.bucketName;
            if (record.cloudflareR2.accountId) {
                envs.R2_ACCOUNT_ID = record.cloudflareR2.accountId;
            }
            if (record.cloudflareR2.accessKeyId) {
                envs.R2_ACCESS_KEY_ID = record.cloudflareR2.accessKeyId;
            }
            if (record.cloudflareR2.secretAccessKey) {
                envs.R2_SECRET_ACCESS_KEY = record.cloudflareR2.secretAccessKey;
            }
            if (record.cloudflareR2.endpoint) {
                envs.R2_ENDPOINT = record.cloudflareR2.endpoint;
                envs.R2_PUBLIC_URL = `${record.cloudflareR2.endpoint.replace(/\/$/, '')}/${record.cloudflareR2.bucketName}`;
            }
        }

        // AWS S3ストレージの設定
        if (record.awsS3) {
            envs.S3_BUCKET_NAME = record.awsS3.bucketName;
            envs.AWS_REGION = record.awsS3.region;
            if (record.awsS3.publicUrl) {
                envs.AWS_S3_PUBLIC_URL = record.awsS3.publicUrl;
            }
            if (record.awsS3.accessKeyId) {
                envs.AWS_ACCESS_KEY_ID = record.awsS3.accessKeyId;
            }
            if (record.awsS3.secretAccessKey) {
                envs.AWS_SECRET_ACCESS_KEY = record.awsS3.secretAccessKey;
            }
        }

        // Supabaseストレージの設定
        if (record.supabaseStorage) {
            envs.SUPABASE_STORAGE_BUCKET = record.supabaseStorage.bucketName;
            if (record.supabaseStorage.url) {
                envs.SUPABASE_STORAGE_URL = record.supabaseStorage.url;
            }
            if (record.supabaseStorage.serviceRoleKey) {
                envs.SUPABASE_STORAGE_SERVICE_ROLE_KEY = record.supabaseStorage.serviceRoleKey;
            }
            if (record.supabaseStorage.anonKey) {
                envs.SUPABASE_STORAGE_ANON_KEY = record.supabaseStorage.anonKey;
            }
        }

        return envs;
    };

    // ローカル/開発環境用の環境変数
    const localUpdates = {
        ...connectionForTurso(devTursoDatabase),
        ...connectionForSupabase(devSupabaseDb),
        ...storageEnvs(),
    };

    if (Object.keys(localUpdates).length > 0) {
        await upsertEnvFile(config.projectPath, '.env.local', localUpdates);
        await upsertEnvFile(config.projectPath, '.env.development', localUpdates);
    }

    // ステージング環境用の環境変数
    const stagingUpdates = {
        ...connectionForTurso(stgTursoDatabase),
        ...connectionForSupabase(stgSupabaseDb),
        ...storageEnvs(),
    };

    if (Object.keys(stagingUpdates).length > 0) {
        await upsertEnvFile(config.projectPath, '.env.staging', stagingUpdates);
    }

    // 本番環境用の環境変数
    const productionUpdates = {
        ...connectionForTurso(prodTursoDatabase),
        ...connectionForSupabase(prodSupabaseDb),
        ...storageEnvs(),
    };

    if (Object.keys(productionUpdates).length > 0) {
        await upsertEnvFile(config.projectPath, '.env.production', productionUpdates);
    }
}
