/**
 * 基本イベント構造定義
 */

/**
 * ベースイベント
 * すべてのイベントの基本構造と共通フィールド
 */
export interface BaseEvent {
    id: string; // イベントの一意識別子
    type: string; // イベントタイプ（ドット区切り形式）
    source: string; // イベントの発生元
    timestamp: number; // イベント発生時刻（Unix timestamp）
    version: string; // イベントスキーマのバージョン
    correlationId?: string; // 関連イベントのグループ化ID
    metadata?: Record<string, unknown>; // イベントの追加メタデータ
}

/**
 * イベントペイロード
 * データを含むイベントのジェネリック型
 */
export interface EventPayload<T = unknown> extends BaseEvent {
    data: T; // イベント固有のデータ
}

/**
 * イベントカテゴリ
 * イベントの分類とフィルタリング用のカテゴリ定義
 */
export type EventCategory =
    | 'project' // プロジェクト関連
    | 'build' // ビルド関連
    | 'deployment' // デプロイメント関連
    | 'file-system' // ファイルシステム関連
    | 'service' // サービス関連
    | 'user' // ユーザーアクション関連
    | 'system' // システム関連
    | 'analytics' // 分析・指標関連
    | 'collaboration'; // コラボレーション関連
