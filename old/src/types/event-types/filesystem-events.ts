/**
 * ファイルシステム関連イベント定義
 */

import type { BaseEvent } from './base.js';

/**
 * ファイルシステムイベント
 * ファイルやディレクトリの変更に関するイベント
 */
export interface FileSystemEvent extends BaseEvent {
    type:
        | 'file.created' // ファイル作成
        | 'file.updated' // ファイル更新
        | 'file.deleted' // ファイル削除
        | 'file.moved' // ファイル移動
        | 'directory.created' // ディレクトリ作成
        | 'directory.deleted'; // ディレクトリ削除
    projectId: string; // 対象プロジェクトのID
    path: string; // ファイル/ディレクトリのパス
}

/**
 * ファイル作成イベント
 * 新しいファイルが作成されたときに発生
 */
export interface FileCreatedEvent extends FileSystemEvent {
    type: 'file.created';
    data: {
        path: string; // 作成されたファイルのパス
        size: number; // ファイルサイズ（バイト）
        type: string; // ファイルタイプ（MIME type）
        encoding?: string; // ファイルエンコーディング
    };
}

/**
 * ファイル更新イベント
 * 既存ファイルが更新されたときに発生
 */
export interface FileUpdatedEvent extends FileSystemEvent {
    type: 'file.updated';
    data: {
        path: string; // 更新されたファイルのパス
        size: number; // 更新後のファイルサイズ（バイト）
        modifiedAt: number; // 最終更新時刻（Unix timestamp）
        changes?: {
            // 変更内容の詳細
            linesAdded: number; // 追加された行数
            linesRemoved: number; // 削除された行数
            characters: number; // 変更された文字数
        };
    };
}
