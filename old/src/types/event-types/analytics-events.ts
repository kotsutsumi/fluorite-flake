/**
 * 分析・指標関連イベント定義
 */

import type { BaseEvent } from './base.js';

/**
 * 分析イベント
 * 指標収集とレポート生成に関するイベント
 */
export interface AnalyticsEvent extends BaseEvent {
    type:
        | 'analytics.metric' // 指標データ
        | 'analytics.milestone' // マイルストーン達成
        | 'analytics.report-generated'; // レポート生成完了
}

/**
 * 分析指標イベント
 * 指標データが収集されたときに発生
 */
export interface AnalyticsMetricEvent extends AnalyticsEvent {
    type: 'analytics.metric';
    data: {
        metric: string; // 指標名
        value: number; // 指標値
        unit?: string; // 単位
        tags?: Record<string, string>; // 分類タグ
        context?: Record<string, unknown>; // 追加コンテキスト
    };
}
