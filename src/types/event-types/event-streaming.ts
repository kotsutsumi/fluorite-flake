/**
 * イベントストリーミングとサブスクリプション関連の型定義
 */

import type { BaseEvent } from './base.js';
import type { EventFilter } from './event-processing.js';

/**
 * イベントストリーム
 * 継続的なイベント配信ストリームの設定
 */
export interface EventStream {
    id: string; // ストリームの一意識別子
    filter: EventFilter; // イベントフィルター
    batchSize: number; // バッチサイズ
    maxBatchWaitTime: number; // バッチ待機最大時間（ミリ秒）
    resumeToken?: string; // 再開用トークン
}

/**
 * イベントバッチ
 * バッチ処理用のイベント群
 */
export interface EventBatch {
    streamId: string; // 関連ストリームID
    events: BaseEvent[]; // バッチ内のイベント群
    resumeToken: string; // 次回継続用トークン
    hasMore: boolean; // 後続データの有無
}

/**
 * イベントサブスクリプション
 * クライアントのイベント購読設定
 */
export interface EventSubscription {
    id: string; // サブスクリプションの一意識別子
    filter: EventFilter; // 受信イベントフィルター
    connectionId: string; // 関連コネクションID
    createdAt: number; // 作成時刻
    lastActivity: number; // 最終アクティビティ時刻
    deliveryMode: 'realtime' | 'batch' | 'replay'; // 配信モード
    acknowledgmentRequired: boolean; // 受信確認の要求
}

/**
 * イベント受信確認
 * イベント処理完了の確認情報
 */
export interface EventAcknowledgment {
    subscriptionId: string; // 関連サブスクリプションID
    eventIds: string[]; // 処理済みイベントIDリスト
    timestamp: number; // 確認時刻
    status: 'processed' | 'failed' | 'skipped'; // 処理状態
    error?: string; // エラー情報（失敗時）
}
