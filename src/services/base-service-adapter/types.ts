/**
 * ベースサービスアダプター型定義
 *
 * 異なるプラットフォーム間で統一されたダッシュボード機能を提供するために
 * 全てのクラウドサービスアダプターが実装しなければならない契約を定義します。
 */

import type { EventEmitter } from 'node:events';

// コアアダプターインターフェース
export interface ServiceAdapter extends EventEmitter {
    // メタデータ
    readonly name: string;
    readonly displayName: string;
    readonly version: string;
    readonly capabilities: ServiceCapabilities;

    // ライフサイクル
    initialize(config?: ServiceConfig): Promise<void>;
    authenticate(authConfig: AuthConfig): Promise<boolean>;
    isAuthenticated(): Promise<boolean>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<HealthStatus>;

    // データ操作
    getDashboardData(options?: DashboardDataOptions): Promise<ServiceDashboardData>;
    getMetrics(options?: MetricsOptions): Promise<ServiceMetrics>;
    getLogs(options?: LogOptions): AsyncIterable<LogEntry>;

    // リソース管理
    listResources(type?: string): Promise<Resource[]>;
    getResource(id: string, type: string): Promise<Resource | null>;
    executeAction(action: ServiceAction): Promise<ActionResult>;

    // リアルタイム機能
    subscribe(event: string, callback: EventCallback): void;
    unsubscribe(event: string, callback?: EventCallback): void;

    // ステータスと監視
    getStatus(): ServiceStatus;
}

// サービス機能定義
export interface ServiceCapabilities {
    /** WebSocket/SSE経由のリアルタイム更新 */
    realTimeUpdates: boolean;
    /** ログストリーミングサポート */
    logStreaming: boolean;
    /** 履歴メトリクスデータ */
    metricsHistory: boolean;
    /** リソースCRUD操作 */
    resourceManagement: boolean;
    /** マルチプロジェクト/アカウントサポート */
    multiProject: boolean;
    /** デプロイメント操作 */
    deployments: boolean;
    /** 分析とインサイト */
    analytics: boolean;
    /** ファイル/オブジェクト操作 */
    fileOperations: boolean;
    /** データベース操作 */
    database: boolean;
    /** 認証/ユーザー管理 */
    userManagement: boolean;
}

// 設定インターフェース
export interface ServiceConfig {
    /** サービス固有の設定オプション */
    [key: string]: unknown;

    /** ミリ秒単位の接続タイムアウト */
    timeout?: number;
    /** APIエンドポイントのオーバーライド */
    endpoint?: string;
    /** レート制限設定 */
    rateLimit?: {
        requestsPerSecond: number;
        burstLimit: number;
    };
    /** リトライ設定 */
    retry?: {
        attempts: number;
        backoffMs: number;
    };
}

export interface AuthConfig {
    /** プライマリ認証トークン/キー */
    token: string;
    /** サポートされている場合のリフレッシュトークン */
    refreshToken?: string;
    /** セッション識別子 */
    sessionId?: string;
    /** 追加の認証パラメータ */
    params?: Record<string, string>;
}

// データ構造インターフェース
export interface ServiceDashboardData {
    /** データが収集されたタイムスタンプ */
    timestamp: number;
    /** サービス固有のデータセクション */
    [section: string]: unknown;
}

export interface DashboardDataOptions {
    /** 含めるべき特定のセクション */
    sections?: string[];
    /** 履歴データの時間範囲 */
    timeRange?: TimeRange;
    /** ページネーションオプション */
    pagination?: PaginationOptions;
    /** 追加のフィルター */
    filters?: Record<string, unknown>;
}

export interface ServiceMetrics {
    /** メトリクスが収集されたタイムスタンプ */
    timestamp: number;
    /** パフォーマンスメトリクス */
    performance: PerformanceMetrics;
    /** 使用量メトリクス */
    usage: UsageMetrics;
    /** エラーメトリクス */
    errors: ErrorMetrics;
    /** サービス固有のメトリクス */
    custom?: Record<string, MetricValue>;
}

export interface MetricsOptions {
    /** メトリクスの時間範囲 */
    timeRange?: TimeRange;
    /** メトリクスの解像度/粒度 */
    resolution?: 'minute' | 'hour' | 'day';
    /** 含めるべき特定のメトリクス */
    metrics?: string[];
}

export interface LogEntry {
    /** 一意のログエントリ識別子 */
    id: string;
    /** ログが生成されたタイムスタンプ */
    timestamp: number;
    /** ログレベル */
    level: LogLevel;
    /** ログメッセージ */
    message: string;
    /** ソースコンポーネント/サービス */
    source: string;
    /** 追加の構造化データ */
    metadata?: Record<string, unknown>;
    /** 該当する場合のリクエスト/トレースID */
    traceId?: string;
}

export interface LogOptions {
    /** Log level filter */
    level?: LogLevel;
    /** Source filter */
    source?: string;
    /** Time range for logs */
    timeRange?: TimeRange;
    /** Search query */
    query?: string;
    /** Maximum number of entries */
    limit?: number;
    /** Real-time streaming */
    follow?: boolean;
}

export interface Resource {
    /** Unique resource identifier */
    id: string;
    /** Resource type */
    type: string;
    /** Display name */
    name: string;
    /** Current status */
    status: ResourceStatus;
    /** Creation timestamp */
    createdAt: number;
    /** Last update timestamp */
    updatedAt: number;
    /** Resource metadata */
    metadata: Record<string, unknown>;
    /** Available actions */
    availableActions: string[];
}

export interface ServiceAction {
    /** Action type */
    type: string;
    /** Target resource ID */
    resourceId?: string;
    /** Action parameters */
    params?: Record<string, unknown>;
    /** Confirmation required flag */
    requiresConfirmation?: boolean;
}

export interface ActionResult {
    /** Whether action succeeded */
    success: boolean;
    /** Result message */
    message: string;
    /** Result data */
    data?: unknown;
    /** Error details if failed */
    error?: {
        code: string;
        details: string;
    };
}

// ステータスとヘルス状態のインターフェース
export interface ServiceStatus {
    /** Current connection status */
    connected: boolean;
    /** Authentication status */
    authenticated: boolean;
    /** Last successful operation timestamp */
    lastActivity?: number;
    /** Current operation being performed */
    currentOperation?: string;
    /** Error status if any */
    error?: string;
}

export interface HealthStatus {
    /** Overall health status */
    status: 'healthy' | 'degraded' | 'unhealthy';
    /** Health check timestamp */
    timestamp: number;
    /** Response time in milliseconds */
    responseTime: number;
    /** Detailed checks */
    checks: HealthCheck[];
    /** Service-specific health data */
    metadata?: Record<string, unknown>;
}

export interface HealthCheck {
    /** Check name */
    name: string;
    /** Check status */
    status: 'pass' | 'fail' | 'warn';
    /** Check result message */
    message: string;
    /** Check duration in milliseconds */
    duration: number;
}

// ユーティリティ型
export interface TimeRange {
    /** Start timestamp */
    start: number;
    /** End timestamp */
    end: number;
}

export interface PaginationOptions {
    /** Page offset */
    offset: number;
    /** Items per page */
    limit: number;
    /** Sort field */
    sortBy?: string;
    /** Sort order */
    sortOrder?: 'asc' | 'desc';
}

export interface PerformanceMetrics {
    /** Average response time in milliseconds */
    avgResponseTime: number;
    /** Request throughput per second */
    throughput: number;
    /** Error rate as percentage */
    errorRate: number;
    /** Active connections */
    activeConnections: number;
}

export interface UsageMetrics {
    /** Total requests */
    requests: number;
    /** Data transfer in bytes */
    dataTransfer: number;
    /** Resource utilization percentage */
    resourceUtilization: number;
    /** Cost information if available */
    cost?: number;
}

export interface ErrorMetrics {
    /** Total error count */
    totalErrors: number;
    /** Errors by type */
    errorsByType: Record<string, number>;
    /** Recent errors */
    recentErrors: ErrorSummary[];
}

export interface ErrorSummary {
    /** Error type */
    type: string;
    /** Error count */
    count: number;
    /** Last occurrence timestamp */
    lastOccurrence: number;
    /** Error message */
    message: string;
}

export interface MetricValue {
    /** Metric value */
    value: number;
    /** Metric unit */
    unit: string;
    /** Value type */
    type: 'gauge' | 'counter' | 'histogram';
}

// 列挙型と定数
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type ResourceStatus = 'active' | 'inactive' | 'pending' | 'error' | 'unknown';
export type EventCallback = (data: unknown) => void;

// サービスファクトリーインターフェース
export interface ServiceFactory {
    createService(type: string, config?: ServiceConfig): Promise<ServiceAdapter>;
    getSupportedServices(): string[];
    getServiceInfo(type: string): ServiceInfo | null;
}

export interface ServiceInfo {
    name: string;
    displayName: string;
    description: string;
    capabilities: ServiceCapabilities;
    authMethods: string[];
    configSchema?: Record<string, unknown>;
}

// サービスイベント型
export type ServiceEvent = string;
