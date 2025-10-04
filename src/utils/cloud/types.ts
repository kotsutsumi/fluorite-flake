import type { ProjectConfig } from '../../commands/create/types.js';

/**
 * クラウドプロビジョニングの動作モード
 * - mock: テスト用のモックモード
 * - real: 実際のクラウドサービスと連携
 */
export type CloudMode = 'mock' | 'real';

/**
 * プロビジョニングされたデータベースの環境種別
 * - dev: 開発環境
 * - stg: ステージング環境
 * - prod: 本番環境
 */
export type ProvisionedDatabaseEnv = 'dev' | 'stg' | 'prod';

/**
 * Tursoデータベースのレコード情報
 */
export interface TursoDatabaseRecord {
    /** 環境種別 */
    env: ProvisionedDatabaseEnv;
    /** データベース名 */
    name: string;
    /** ホスト名 */
    hostname: string;
    /** データベースURL */
    databaseUrl: string;
    /** 認証トークン */
    authToken: string;
}

/**
 * Tursoプロビジョニングの総合レコード
 */
export interface TursoProvisioningRecord {
    /** 組織名 */
    organization: string;
    /** グループ名 */
    group: string;
    /** データベース一覧 */
    databases: TursoDatabaseRecord[];
}

/**
 * Vercelプロジェクトのレコード情報
 */
export interface VercelProjectRecord {
    /** プロジェクトID */
    projectId: string;
    /** プロジェクト名 */
    projectName: string;
    /** チームID（オプション） */
    teamId?: string;
    /** 本番環境URL（オプション） */
    productionUrl?: string;
}

/**
 * Vercel Blobストレージのレコード情報
 */
export interface VercelBlobRecord {
    /** ストアID */
    storeId: string;
    /** ストア名 */
    storeName: string;
    /** 読み書きトークン */
    readWriteToken: string;
}

/**
 * Cloudflare R2ストレージのレコード情報
 */
export interface CloudflareR2Record {
    /** バケット名 */
    bucketName: string;
    /** アカウントID（オプション） */
    accountId?: string;
    /** アクセスキーID（オプション） */
    accessKeyId?: string;
    /** シークレットアクセスキー（オプション） */
    secretAccessKey?: string;
    /** エンドポイントURL（オプション） */
    endpoint?: string;
}

/**
 * Supabaseストレージのレコード情報
 */
export interface SupabaseStorageRecord {
    /** バケット名 */
    bucketName: string;
    /** バケットID */
    bucketId: string;
    /** パブリックアクセス許可 */
    isPublic: boolean;
    /** プロジェクト参照（オプション） */
    projectRef?: string;
    /** サービスロールキー（オプション） */
    serviceRoleKey?: string;
    /** 匿名キー（オプション） */
    anonKey?: string;
    /** ベースURL（オプション） */
    url?: string;
}

/**
 * AWS S3ストレージのレコード情報
 */
export interface AwsS3Record {
    /** バケット名 */
    bucketName: string;
    /** AWSリージョン */
    region: string;
    /** アクセスキーID（オプション） */
    accessKeyId?: string;
    /** シークレットアクセスキー（オプション） */
    secretAccessKey?: string;
    /** パブリックアクセスURL（オプション） */
    publicUrl?: string;
}

/**
 * Supabaseデータベースのレコード情報
 */
export interface SupabaseDatabaseRecord {
    /** 環境種別 */
    env: ProvisionedDatabaseEnv;
    /** プロジェクト参照 */
    projectRef: string;
    /** データベースURL */
    databaseUrl: string;
    /** データベースパスワード（オプション） */
    dbPassword?: string;
    /** API URL（オプション） */
    apiUrl?: string;
    /** 匿名キー */
    anonKey: string;
    /** サービスロールキー */
    serviceRoleKey: string;
}

/**
 * Supabaseプロビジョニングの総合レコード
 */
export interface SupabaseProvisioningRecord {
    /** プロジェクト名 */
    projectName: string;
    /** 組織名（オプション） */
    organization?: string;
    /** データベース一覧 */
    databases: SupabaseDatabaseRecord[];
}

/**
 * クラウドプロビジョニングの総合レコード
 * 全サービスのプロビジョニング情報を一元管理
 */
export interface CloudProvisioningRecord {
    /** 動作モード */
    mode: CloudMode;
    /** 作成日時 */
    createdAt: string;
    /** プロジェクト名 */
    projectName: string;
    /** Tursoプロビジョニング情報（オプション） */
    turso?: TursoProvisioningRecord;
    /** Supabaseプロビジョニング情報（オプション） */
    supabase?: SupabaseProvisioningRecord;
    /** Vercelプロジェクト情報（オプション） */
    vercel?: VercelProjectRecord;
    /** Vercel Blobストレージ情報（オプション） */
    vercelBlob?: VercelBlobRecord;
    /** Cloudflare R2ストレージ情報（オプション） */
    cloudflareR2?: CloudflareR2Record;
    /** AWS S3ストレージ情報（オプション） */
    awsS3?: AwsS3Record;
    /** Supabaseストレージ情報（オプション） */
    supabaseStorage?: SupabaseStorageRecord;
}

/**
 * クラウドプロビジョナーのインターフェース
 * クラウドリソースの作成・設定を抽象化
 */
export interface CloudProvisioner {
    /** 動作モード（読み取り専用） */
    readonly mode: CloudMode;
    /**
     * プロジェクト設定に基づいてクラウドリソースをプロビジョニングします
     * @param config プロジェクトの設定
     * @returns プロビジョニング結果のレコード
     */
    provision(config: ProjectConfig): Promise<CloudProvisioningRecord>;
}
