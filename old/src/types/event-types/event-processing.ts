/**
 * イベント処理関連の型定義
 */

import type { BaseEvent, EventCategory } from './base.js';

/**
 * イベントハンドラー
 * 特定のイベントを処理する関数の型
 */
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;

/**
 * イベントミドルウェア
 * イベント処理前後に実行される関数の型
 */
export type EventMiddleware = (event: BaseEvent, next: () => Promise<void>) => Promise<void>;

/**
 * イベントフィルター
 * イベントの選択的処理用のフィルター条件
 */
export interface EventFilter {
    type?: string | string[]; // イベントタイプ
    source?: string | string[]; // イベント発生元
    category?: EventCategory | EventCategory[]; // イベントカテゴリ
    metadata?: Record<string, unknown>; // メタデータ条件
    custom?: (event: BaseEvent) => boolean; // カスタムフィルター関数
}
