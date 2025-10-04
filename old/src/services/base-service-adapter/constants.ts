/**
 * ベースサービスアダプター定数定義
 *
 * サービスアダプターで使用される定数やイベントタイプを定義します。
 */

// リアルタイム更新用のイベントタイプ
export const SERVICE_EVENTS = {
    /** 接続ステータスが変更された */
    CONNECTION_CHANGED: 'connection:changed',
    /** 認証ステータスが変更された */
    AUTH_CHANGED: 'auth:changed',
    /** ダッシュボードデータが更新された */
    DASHBOARD_UPDATED: 'dashboard:updated',
    /** 新しいログエントリ */
    LOG_ENTRY: 'log:entry',
    /** メトリクスが更新された */
    METRICS_UPDATED: 'metrics:updated',
    /** Resource status changed */
    RESOURCE_CHANGED: 'resource:changed',
    /** Error occurred */
    ERROR: 'error',
    /** Health status changed */
    HEALTH_CHANGED: 'health:changed',
} as const;

export type ServiceEvent = (typeof SERVICE_EVENTS)[keyof typeof SERVICE_EVENTS];
