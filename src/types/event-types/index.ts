/**
 * イベントシステム型定義統合エクスポート
 *
 * ダッシュボードコンポーネントとコアサービス間の
 * リアルタイム通信用イベント駆動アーキテクチャを定義
 */

// 基本型定義
export type {
    BaseEvent,
    EventPayload,
    EventCategory,
} from './base.js';

// プロジェクト関連イベント
export type {
    ProjectEvent,
    ProjectCreatedEvent,
    ProjectUpdatedEvent,
} from './project-events.js';

// ビルド関連イベント
export type {
    BuildEvent,
    BuildStartedEvent,
    BuildProgressEvent,
    BuildCompletedEvent,
} from './build-events.js';

// ファイルシステム関連イベント
export type {
    FileSystemEvent,
    FileCreatedEvent,
    FileUpdatedEvent,
} from './filesystem-events.js';

// サービス関連イベント
export type {
    ServiceEvent,
    ServiceStartedEvent,
    ServiceErrorEvent,
} from './service-events.js';

// ユーザー関連イベント
export type {
    UserEvent,
    UserActionEvent,
} from './user-events.js';

// システム関連イベント
export type {
    SystemEvent,
    SystemResourceWarningEvent,
} from './system-events.js';

// 分析・指標関連イベント
export type {
    AnalyticsEvent,
    AnalyticsMetricEvent,
} from './analytics-events.js';

// コラボレーション関連イベント
export type {
    CollaborationEvent,
    CollaborationUserJoinedEvent,
} from './collaboration-events.js';

// イベント処理関連
export type {
    EventHandler,
    EventMiddleware,
    EventFilter,
} from './event-processing.js';

// イベントストア関連
export type {
    EventStoreConfig,
    StoredEvent,
    EventQuery,
} from './event-store.js';

// イベントストリーミング関連
export type {
    EventStream,
    EventBatch,
    EventSubscription,
    EventAcknowledgment,
} from './event-streaming.js';

// イベントバス関連
export type {
    EventBusConfig,
    EventMetrics,
} from './event-bus.js';

// 統合イベント型
export type { DashboardEvent } from './event-union.js';
