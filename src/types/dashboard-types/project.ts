/**
 * プロジェクト管理関連の型定義
 */

/**
 * プロジェクトの基本情報と設定を表すインターフェース
 * プロジェクトの識別情報、状態、設定、統計データを含む
 */
export interface Project {
    id: string; // プロジェクトの一意識別子
    name: string; // プロジェクト名
    framework: 'nextjs' | 'expo' | 'tauri' | 'flutter'; // 使用フレームワーク
    path: string; // プロジェクトのファイルシステムパス
    status: 'active' | 'inactive' | 'building' | 'error'; // プロジェクトの現在の状態
    createdAt: number; // 作成日時（Unix timestamp）
    updatedAt: number; // 最終更新日時（Unix timestamp）
    metadata: ProjectMetadata; // プロジェクトのメタデータ
    configuration: ProjectConfiguration; // プロジェクトの設定情報
    statistics: ProjectStatistics; // プロジェクトの統計データ
}

/**
 * プロジェクトのメタデータ情報
 * 説明、バージョン、作成者などの補助的な情報を格納
 */
export interface ProjectMetadata {
    description?: string; // プロジェクトの説明文
    version?: string; // プロジェクトのバージョン
    author?: string; // プロジェクト作成者
    tags: string[]; // プロジェクトに付与されたタグ
    repository?: string; // リポジトリURL
    lastActivity?: number; // 最終活動日時（Unix timestamp）
    thumbnailPath?: string; // プロジェクトのサムネイル画像パス
}

/**
 * プロジェクトの設定情報
 * データベース、ORM、ストレージなどの技術的な設定を管理
 */
export interface ProjectConfiguration {
    database: 'none' | 'turso' | 'supabase'; // 使用するデータベース
    orm?: 'prisma' | 'drizzle'; // 使用するORMライブラリ
    deployment: boolean; // デプロイメント設定の有無
    storage: 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage'; // ストレージプロバイダー
    auth: boolean; // 認証機能の有無
    packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun'; // パッケージマネージャー
    customConfigurations?: Record<string, unknown>; // カスタム設定項目
}

/**
 * プロジェクトの統計データ
 * ビルド回数、成功率、パフォーマンス指標などを追跡
 */
export interface ProjectStatistics {
    buildCount: number; // 総ビルド回数
    deploymentCount: number; // 総デプロイ回数
    lastBuildTime?: number; // 最終ビルド実行時間（Unix timestamp）
    lastDeploymentTime?: number; // 最終デプロイ時間（Unix timestamp）
    buildSuccessRate: number; // ビルド成功率（0-1の値）
    averageBuildDuration: number; // 平均ビルド時間（ミリ秒）
    fileCount?: number; // プロジェクト内のファイル数
    lineCount?: number; // プロジェクト内の総行数
    dependencyCount?: number; // 依存関係の数
}
