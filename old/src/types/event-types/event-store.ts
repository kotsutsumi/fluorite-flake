/**
 * イベントストアと永続化関連の型定義
 */

import type { BaseEvent } from './base.js';

/**
 * イベントストア設定
 * イベントの保存と管理に関する設定
 */
export interface EventStoreConfig {
    maxEvents: number; // 最大イベント保存数
    retentionDays: number; // イベント保存期間（日）
    batchSize: number; // バッチ処理サイズ
    compressionEnabled: boolean; // 圧縮の有効化
    indexFields: string[]; // インデックス化するフィールド
}

/**
 * 保存済みイベント
 * 永続化されたイベントの拡張情報
 */
export interface StoredEvent extends BaseEvent {
    persistedAt: number; // 保存時刻（Unix timestamp）
    sequence: number; // シーケンス番号
    checksum?: string; // データ整合性チェック用ハッシュ
}

/**
 * イベント検索クエリ
 * 保存されたイベントの検索条件
 */
export interface EventQuery {
    types?: string[]; // 検索対象のイベントタイプ
    sources?: string[]; // 検索対象の発生元
    startTime?: number; // 検索開始時刻
    endTime?: number; // 検索終了時刻
    correlationId?: string; // 関連ID
    limit?: number; // 取得件数制限
    offset?: number; // 取得開始位置
    orderBy?: 'timestamp' | 'sequence'; // ソート基準
    orderDirection?: 'asc' | 'desc'; // ソート順序
}
