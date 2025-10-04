/**
 * コラボレーション関連イベント定義
 */

import type { BaseEvent } from './base.js';

/**
 * コラボレーションイベント
 * 複数ユーザー間の協同作業に関するイベント
 */
export interface CollaborationEvent extends BaseEvent {
    type:
        | 'collaboration.user-joined' // ユーザー参加
        | 'collaboration.user-left' // ユーザー離脱
        | 'collaboration.cursor-moved' // カーソル移動
        | 'collaboration.file-edited'; // ファイル編集
    sessionId: string; // コラボレーションセッションID
    userId: string; // ユーザーID
}

/**
 * コラボレーションユーザー参加イベント
 * ユーザーがコラボレーションセッションに参加したときに発生
 */
export interface CollaborationUserJoinedEvent extends CollaborationEvent {
    type: 'collaboration.user-joined';
    data: {
        user: {
            // 参加ユーザー情報
            id: string; // ユーザーID
            name: string; // ユーザー名
            avatar?: string; // アバター画像URL
            role: string; // ユーザーロール
        };
        sessionId: string; // コラボレーションセッションID
    };
}
