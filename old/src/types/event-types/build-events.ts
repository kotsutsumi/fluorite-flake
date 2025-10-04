/**
 * ビルド関連イベント定義
 */

import type { BaseEvent } from './base.js';

/**
 * ビルドイベント
 * ビルドプロセスのライフサイクルに関するイベント
 */
export interface BuildEvent extends BaseEvent {
    type:
        | 'build.started' // ビルド開始
        | 'build.progress' // ビルド進行状況
        | 'build.completed' // ビルド完了
        | 'build.failed' // ビルド失敗
        | 'build.cancelled'; // ビルドキャンセル
    buildId: string; // ビルドの一意識別子
    projectId: string; // 対象プロジェクトのID
}

/**
 * ビルド開始イベント
 * ビルドプロセスが開始されたときに発生
 */
export interface BuildStartedEvent extends BuildEvent {
    type: 'build.started';
    data: {
        buildId: string; // ビルドの一意識別子
        projectId: string; // 対象プロジェクトのID
        configuration: {
            target: string; // ビルド対象（dev, prod, test等）
            environment: string; // 環境設定
        };
    };
}

/**
 * ビルド進行状況イベント
 * ビルドの進行状況や段階が更新されたときに発生
 */
export interface BuildProgressEvent extends BuildEvent {
    type: 'build.progress';
    data: {
        buildId: string; // ビルドの一意識別子
        stage: string; // 現在のビルド段階
        progress: number; // 進行率（0-100）
        message?: string; // 進行状況メッセージ
        estimatedTimeRemaining?: number; // 残り時間の推定値（秒）
    };
}

/**
 * ビルド完了イベント
 * ビルドが正常に完了したときに発生
 */
export interface BuildCompletedEvent extends BuildEvent {
    type: 'build.completed';
    data: {
        buildId: string; // ビルドの一意識別子
        duration: number; // ビルド実行時間（ミリ秒）
        artifacts: Array<{
            // 生成されたアーティファクト
            name: string; // アーティファクト名
            size: number; // ファイルサイズ（バイト）
            type: string; // ファイルタイプ
        }>;
        metrics: {
            // ビルドメトリクス
            bundleSize: number; // バンドルサイズ（バイト）
            buildTime: number; // ビルド時間（ミリ秒）
            warnings: number; // 警告数
            errors: number; // エラー数
        };
    };
}
