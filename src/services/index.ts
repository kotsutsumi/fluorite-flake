/**
 * サービスモジュールインデックス
 *
 * マルチサービスダッシュボードシステム用の
 * 全てのサービスアダプター、ファクトリー、および関連機能をエクスポートします。
 */

// ベースサービスアダプターのエクスポート
export {
    BaseServiceAdapter,
    SERVICE_EVENTS,
    type ServiceAdapter,
    type ServiceCapabilities,
    type ServiceConfig,
    type AuthConfig,
    type ServiceDashboardData,
    type ServiceMetrics,
    type LogEntry,
    type Resource,
    type ServiceAction,
    type ActionResult,
    type HealthStatus,
    type ServiceStatus,
    type DashboardDataOptions,
    type MetricsOptions,
    type LogOptions,
    type TimeRange,
    type PaginationOptions,
    type PerformanceMetrics,
    type UsageMetrics,
    type ErrorMetrics,
    type MetricValue,
    type LogLevel,
    type ResourceStatus,
    type EventCallback,
    type ServiceEvent,
    type ServiceFactory,
    type ServiceInfo,
} from './base-service-adapter.js';

// サービスファクトリーのエクスポート
export {
    DefaultServiceFactory,
    ServiceRegistry,
    serviceFactory,
    SERVICE_INFO,
    type SupportedService,
} from './service-factory.js';

// サービスアダプターのエクスポート
export { VercelAdapter } from './adapters/vercel-adapter.js';

// ダッシュボードオーケストレーターのエクスポート
export {
    DashboardOrchestrator,
    ORCHESTRATOR_EVENTS,
    type DashboardConfig,
    type MultiServiceDashboardData,
    type AggregatedMetrics,
    type DashboardInsight,
    type ServiceRegistry as ServiceRegistryInterface,
} from '../dashboard/dashboard-orchestrator.js';
