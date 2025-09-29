/**
 * マルチサービスダッシュボード関連の型定義
 *
 * ダッシュボードオプション、サポート対象サービス、
 * インターフェースなどの型定義を提供します。
 *
 * @module types
 */

// サポートされているサービス
export const SUPPORTED_SERVICES = [
    'vercel',
    'supabase',
    'turso',
    'aws',
    'github',
    'cloudflare',
] as const;

export type SupportedService = (typeof SUPPORTED_SERVICES)[number];

// コマンドオプションのインターフェース
export interface DashboardOptions {
    /** 出力モード */
    mode?: 'cli' | 'tui' | 'json';
    /** TUIモードのテーマ */
    theme?: 'dark' | 'light' | 'auto';
    /** TUIモードのレイアウトスタイル */
    layout?: 'grid' | 'tabs' | 'split';
    /** リフレッシュ間隔（ミリ秒） */
    refresh?: number;
    /** JSON出力形式 */
    json?: boolean;
    /** 通信用ホスト */
    host?: string;
    /** 通信用ポート */
    port?: number;
    /** 認証トークン */
    token?: string;
    /** 通信プロトコル */
    protocol?: 'ws' | 'rest';
    /** プロジェクト/アカウントフィルター */
    project?: string;
    /** リージョンフィルター */
    region?: string;
    /** 環境フィルター */
    env?: string;
    /** マルチモード用のサービス */
    services?: string[];
    /** データ同期を有効化 */
    sync?: boolean;
    /** メトリクス集約を有効化 */
    aggregate?: boolean;
}
