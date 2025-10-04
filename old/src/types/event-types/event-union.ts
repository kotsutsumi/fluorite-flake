/**
 * 統合イベント型定義
 */

import type { ProjectEvent } from './project-events.js';
import type { BuildEvent } from './build-events.js';
import type { FileSystemEvent } from './filesystem-events.js';
import type { ServiceEvent } from './service-events.js';
import type { UserEvent } from './user-events.js';
import type { SystemEvent } from './system-events.js';
import type { AnalyticsEvent } from './analytics-events.js';
import type { CollaborationEvent } from './collaboration-events.js';

/**
 * 統合イベント型
 * ダッシュボードで使用される全イベント型の統合
 */
export type DashboardEvent =
    | ProjectEvent // プロジェクト関連イベント
    | BuildEvent // ビルド関連イベント
    | FileSystemEvent // ファイルシステム関連イベント
    | ServiceEvent // サービス関連イベント
    | UserEvent // ユーザー関連イベント
    | SystemEvent // システム関連イベント
    | AnalyticsEvent // 分析関連イベント
    | CollaborationEvent; // コラボレーション関連イベント
