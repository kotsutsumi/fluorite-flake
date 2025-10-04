/**
 * ユーザー関連イベント定義
 */

import type { BaseEvent } from './base.js';

/**
 * ユーザーイベント
 * ユーザーアクションとセッション管理に関するイベント
 */
export interface UserEvent extends BaseEvent {
    type:
        | 'user.action' // ユーザーアクション
        | 'user.session-start' // セッション開始
        | 'user.session-end'; // セッション終了
    userId?: string; // ユーザーID（匿名の場合はnull）
    sessionId: string; // セッションの一意識別子
}

/**
 * ユーザーアクションイベント
 * ユーザーが何らかのアクションを実行したときに発生
 */
export interface UserActionEvent extends UserEvent {
    type: 'user.action';
    data: {
        action: string; // 実行されたアクション名
        target?: string; // アクションの対象
        parameters?: Record<string, unknown>; // アクションパラメータ
        duration?: number; // アクション実行時間（ミリ秒）
    };
}
