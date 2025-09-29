/**
 * サービス関連イベント定義
 */

import type { BaseEvent } from './base.js';

/**
 * サービスイベント
 * サービスのライフサイクルと状態変更に関するイベント
 */
export interface ServiceEvent extends BaseEvent {
    type:
        | 'service.started' // サービス開始
        | 'service.stopped' // サービス停止
        | 'service.error' // サービスエラー
        | 'service.health-check'; // ヘルスチェック
    serviceId: string; // サービスの一意識別子
}

/**
 * サービス開始イベント
 * サービスが正常に開始されたときに発生
 */
export interface ServiceStartedEvent extends ServiceEvent {
    type: 'service.started';
    data: {
        serviceId: string; // サービスの一意識別子
        serviceName: string; // サービス名
        pid?: number; // プロセスID
        port?: number; // 使用ポート番号
        version?: string; // サービスバージョン
    };
}

/**
 * サービスエラーイベント
 * サービスでエラーが発生したときに発生
 */
export interface ServiceErrorEvent extends ServiceEvent {
    type: 'service.error';
    data: {
        serviceId: string; // エラーが発生したサービスのID
        error: {
            // エラー詳細
            code: string; // エラーコード
            message: string; // エラーメッセージ
            stack?: string; // スタックトレース
        };
        recoverable: boolean; // 回復可能かどうか
    };
}
