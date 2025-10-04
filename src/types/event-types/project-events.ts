/**
 * プロジェクト関連イベント定義
 */

import type { BaseEvent } from './base.js';

/**
 * プロジェクトイベント
 * プロジェクトのライフサイクルに関するイベント
 */
export interface ProjectEvent extends BaseEvent {
    type:
        | 'project.created' // プロジェクト作成
        | 'project.updated' // プロジェクト更新
        | 'project.deleted' // プロジェクト削除
        | 'project.opened' // プロジェクト開放
        | 'project.closed'; // プロジェクト閉鎖
    projectId: string; // 対象プロジェクトのID
}

/**
 * プロジェクト作成イベント
 * 新しいプロジェクトが作成されたときに発生
 */
export interface ProjectCreatedEvent extends ProjectEvent {
    type: 'project.created';
    data: {
        project: {
            id: string; // 作成されたプロジェクトのID
            name: string; // プロジェクト名
            framework: string; // 使用フレームワーク
            path: string; // プロジェクトパス
        };
    };
}

/**
 * プロジェクト更新イベント
 * プロジェクトの設定やメタデータが更新されたときに発生
 */
export interface ProjectUpdatedEvent extends ProjectEvent {
    type: 'project.updated';
    data: {
        projectId: string; // 更新されたプロジェクトのID
        changes: Record<string, unknown>; // 変更された項目と新しい値
        previousValues?: Record<string, unknown>; // 変更前の値（差分表示用）
    };
}
