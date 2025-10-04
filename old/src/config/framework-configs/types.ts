/**
 * フレームワーク設定に関する型定義
 * 各フレームワークとそのサポート機能を定義
 */

/** サポートされているフレームワークの種類 */
export type FrameworkType = 'nextjs' | 'expo' | 'tauri' | 'flutter';

/** サポートされているデータベースの種類 */
export type DatabaseType = 'none' | 'turso' | 'supabase';

/** サポートされているORMの種類 */
export type OrmType = 'prisma' | 'drizzle';

/** サポートされているストレージサービスの種類 */
export type StorageType = 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage';

/** サポートされているパッケージマネージャーの種類 */
export type PackageManagerType = 'npm' | 'pnpm' | 'yarn' | 'bun';

/**
 * フレームワーク機能の対応状況
 * 各フレームワークがサポートする機能のフラグ定義
 */
export interface FrameworkFeatures {
    database: boolean; // データベース機能の対応
    auth: boolean; // 認証機能の対応
    storage: boolean; // ストレージ機能の対応
    deployment: boolean; // デプロイ機能の対応
    packageManager: boolean; // パッケージマネージャー選択の対応
}

/**
 * フレームワークバージョン定義
 * パッケージ名とそのバージョン指定のマップ
 */
export interface FrameworkVersions {
    [key: string]: string; // パッケージ名: バージョン指定
}

/**
 * フレームワーク設定
 * 各フレームワークの完全な設定情報を定義
 */
export interface FrameworkConfig {
    name: string; // フレームワークの内部名
    displayName: string; // ユーザー表示用の名前
    defaultName: string; // プロジェクトのデフォルト名
    description: string; // フレームワークの説明
    supportedFeatures: FrameworkFeatures; // サポートする機能一覧
    supportedDatabases: DatabaseType[]; // 対応データベース一覧
    supportedOrms: OrmType[]; // 対応ORM一覧
    supportedStorage: StorageType[]; // 対応ストレージサービス一覧
    versions: FrameworkVersions; // パッケージバージョン定義
    requiredDependencies: string[]; // 必須依存関係
    devDependencies: string[]; // 開発依存関係
}
