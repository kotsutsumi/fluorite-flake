/**
 * イベントバス関連の型定義
 */

/**
 * イベントバス設定
 * イベントバスの動作設定
 */
export interface EventBusConfig {
    maxListeners: number; // 最大リスナー数
    eventTTL: number; // イベントの生存時間（ミリ秒）
    retryPolicy: {
        // リトライポリシー
        maxRetries: number; // 最大リトライ回数
        backoffMultiplier: number; // バックオフ倍率
        maxBackoffTime: number; // 最大バックオフ時間（ミリ秒）
    };
    deadLetterQueue: {
        // デッドレターキュー設定
        enabled: boolean; // 有効化フラグ
        maxSize: number; // 最大キューサイズ
    };
    metrics: {
        // メトリクス設定
        enabled: boolean; // メトリクス収集の有効化
        flushInterval: number; // メトリクス出力間隔（ミリ秒）
    };
}

/**
 * イベントパフォーマンスメトリクス
 * イベントシステムの性能指標
 */
export interface EventMetrics {
    totalEvents: number; // 総イベント処理数
    eventsPerSecond: number; // 秒間イベント処理数
    averageProcessingTime: number; // 平均処理時間（ミリ秒）
    failureRate: number; // 失敗率（0-1）
    queueDepth: number; // キューの深さ
    activeSubscriptions: number; // アクティブなサブスクリプション数
    lastProcessedEventTime: number; // 最終処理時刻
}
