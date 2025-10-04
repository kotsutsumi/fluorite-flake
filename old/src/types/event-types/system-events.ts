/**
 * システム関連イベント定義
 */

import type { BaseEvent } from './base.js';

/**
 * システムイベント
 * システム全体の状態変更と管理に関するイベント
 */
export interface SystemEvent extends BaseEvent {
    type:
        | 'system.startup' // システム起動
        | 'system.shutdown' // システム停止
        | 'system.error' // システムエラー
        | 'system.resource-warning'; // リソース警告
}

/**
 * システムリソース警告イベント
 * システムリソースが閾値を超えたときに発生
 */
export interface SystemResourceWarningEvent extends SystemEvent {
    type: 'system.resource-warning';
    data: {
        resource: 'memory' | 'cpu' | 'disk' | 'network'; // リソースタイプ
        current: number; // 現在の使用量
        threshold: number; // 警告閾値
        unit: string; // 単位（%, MB, GB等）
        recommendation?: string; // 推奨対処法
    };
}
