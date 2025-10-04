/**
 * ダッシュボードデータインターフェース定義
 *
 * ダッシュボードの状態管理、プロジェクト管理、
 * UIコンポーネントのデータ構造の型定義を提供
 *
 * 新しいマルチサービスダッシュボードアーキテクチャに対応
 */

// 外部使用向けのサービスアダプター型の再エクスポート
export type {
    ServiceAdapter,
    ServiceCapabilities,
    ServiceConfig,
    AuthConfig,
    ServiceDashboardData,
    LogEntry,
    Resource,
    ServiceAction,
    ActionResult,
    HealthStatus,
    DashboardDataOptions,
    MetricsOptions,
    LogOptions,
    TimeRange,
    PaginationOptions,
    PerformanceMetrics,
    UsageMetrics,
    ErrorMetrics,
    MetricValue,
    ServiceMetrics,
    LogLevel,
    ResourceStatus,
    EventCallback,
    ServiceEvent,
    BaseServiceAdapter,
    ServiceFactory,
    ServiceInfo,
} from '../../services/base-service-adapter/index.js';

// ダッシュボードオーケストレーター型の再エクスポート
export type {
    DashboardConfig,
    MultiServiceDashboardData,
    AggregatedMetrics,
    DashboardInsight,
    ServiceRegistry,
    DashboardOrchestrator,
} from '../../dashboard/dashboard-orchestrator.js';

// サービスファクトリー型の再エクスポート
export type {
    DefaultServiceFactory,
    ServiceRegistry as ServiceRegistryClass,
    SupportedService,
} from '../../services/service-factory/index.js';

// プロジェクト管理関連の型
export type {
    Project,
    ProjectMetadata,
    ProjectConfiguration,
    ProjectStatistics,
} from './project.js';

// ビルドとデプロイメント関連の型
export type {
    BuildProcess,
    BuildLog,
    BuildArtifact,
    BuildConfiguration,
} from './build.js';

// サービスとプロセス管理関連の型
export type {
    ServiceStatus,
    ServiceConfiguration,
} from './service.js';

// ファイルシステムとプロジェクト構造関連の型
export type {
    FileSystemNode,
    FileMetadata,
} from './filesystem.js';

// ダッシュボードUI状態管理の型
export type {
    DashboardState,
    TabState,
    LayoutConfiguration,
    Notification,
    NotificationAction,
    FilterConfiguration,
} from './ui-state.js';

// 分析・監視関連の型
export type {
    AnalyticsData,
    ProjectActivity,
    BuildTrend,
    PerformanceMetric,
    UserActivity,
    SystemHealthMetric,
} from './analytics.js';

// 検索・発見機能関連の型
export type {
    SearchQuery,
    SearchFilter,
    SearchResult,
    SearchHighlight,
} from './search.js';

// リアルタイムコラボレーション関連の型
export type {
    CollaborationSession,
    Participant,
    CursorPosition,
} from './collaboration.js';
