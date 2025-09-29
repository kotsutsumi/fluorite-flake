/**
 * ベースサービスアダプターモジュール
 *
 * サービスアダプターの基底クラス、インターフェース、定数の統一エクスポート
 */

// 型定義をエクスポート
export type {
    ActionResult,
    AuthConfig,
    DashboardDataOptions,
    ErrorMetrics,
    ErrorSummary,
    EventCallback,
    HealthCheck,
    HealthStatus,
    LogEntry,
    LogLevel,
    LogOptions,
    MetricValue,
    MetricsOptions,
    PaginationOptions,
    PerformanceMetrics,
    Resource,
    ResourceStatus,
    ServiceAction,
    ServiceAdapter,
    ServiceCapabilities,
    ServiceConfig,
    ServiceDashboardData,
    ServiceEvent,
    ServiceFactory,
    ServiceInfo,
    ServiceMetrics,
    ServiceStatus,
    TimeRange,
    UsageMetrics,
} from './types.js';

// 定数をエクスポート
export { SERVICE_EVENTS } from './constants.js';

// 実装クラスをエクスポート
export { BaseServiceAdapter } from './base-adapter.js';
