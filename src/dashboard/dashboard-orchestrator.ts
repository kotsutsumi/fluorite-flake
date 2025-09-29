/**
 * ダッシュボードオーケストレーター
 *
 * マルチサービスダッシュボード操作の中央コーディネーター。
 * サービスライフサイクル管理、コマンドルーティング、データ集約を担当します。
 */

import { EventEmitter } from 'node:events';
import type {
    ServiceAdapter,
    ServiceConfig,
    AuthConfig,
    ServiceDashboardData,
    ServiceMetrics,
    LogEntry,
    ServiceAction,
    ActionResult,
    HealthStatus,
    ServiceStatus,
    DashboardDataOptions,
    MetricsOptions,
    LogOptions,
    ServiceFactory,
} from '../services/base-service-adapter.js';

export interface DashboardConfig {
    /** ダッシュボードデータのデフォルト更新間隔 */
    refreshInterval: number;
    /** 起動時に初期化するサービス */
    autoInitServices: string[];
    /** グローバル認証設定 */
    auth?: Record<string, AuthConfig>;
    /** 通信プロトコル設定 */
    protocol: {
        /** 主要プロトコル（websocket、rest） */
        primary: 'websocket' | 'rest';
        /** リアルタイム通信用WebSocketポート */
        wsPort: number;
        /** REST API用HTTPポート */
        httpPort: number;
        /** IPC認証トークン */
        authToken?: string;
    };
    /** TUI表示オプション */
    display: {
        /** テーマ（dark、light、auto） */
        theme: 'dark' | 'light' | 'auto';
        /** レイアウトスタイル（grid、tabs、split） */
        layout: 'grid' | 'tabs' | 'split';
        /** 自動更新有効化 */
        autoRefresh: boolean;
    };
}

export interface MultiServiceDashboardData {
    /** データが集約された時刻 */
    timestamp: number;
    /** 個別サービスデータ */
    services: Record<string, ServiceDashboardData>;
    /** サービス間の集約メトリクス */
    aggregated: AggregatedMetrics;
    /** サービス横断インサイト */
    insights: DashboardInsight[];
}

export interface AggregatedMetrics {
    /** 全サービスの総リソース数 */
    totalResources: number;
    /** 全サービスの総エラー数 */
    totalErrors: number;
    /** 全体の健全性ステータス */
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    /** 統合パフォーマンスメトリクス */
    performance: {
        avgResponseTime: number;
        totalThroughput: number;
        combinedErrorRate: number;
    };
    /** 利用可能な場合のコスト情報 */
    totalCost?: number;
}

export interface DashboardInsight {
    /** インサイトタイプ */
    type: 'warning' | 'info' | 'error' | 'success';
    /** インサイトタイトル */
    title: string;
    /** インサイトメッセージ */
    message: string;
    /** 関連サービス */
    services: string[];
    /** 推奨アクション */
    actions?: string[];
    /** 優先度レベル */
    priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ServiceRegistry {
    /** 登録されたサービスアダプター */
    services: Map<string, ServiceAdapter>;
    /** サービス設定 */
    configs: Map<string, ServiceConfig>;
    /** サービス健全性ステータス */
    health: Map<string, HealthStatus>;
}

/**
 * ダッシュボードオーケストレーター
 *
 * 複数のクラウドサービスを管理し、統合ダッシュボード操作を提供します。
 * サービスライフサイクル、データ集約、リアルタイム更新を処理します。
 */
export class DashboardOrchestrator extends EventEmitter {
    private registry: ServiceRegistry = {
        services: new Map(),
        configs: new Map(),
        health: new Map(),
    };

    private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
    private isInitialized = false;

    constructor(
        private config: DashboardConfig,
        private serviceFactory: ServiceFactory
    ) {
        super();
        this.setupEventHandlers();
    }

    /**
     * ダッシュボードオーケストレーターの初期化
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // 自動開始サービスの初期化
            for (const serviceName of this.config.autoInitServices) {
                await this.addService(serviceName);
            }

            this.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * サービスの追加と初期化
     */
    async addService(
        serviceName: string,
        config?: ServiceConfig,
        authConfig?: AuthConfig
    ): Promise<void> {
        if (this.registry.services.has(serviceName)) {
            throw new Error(`Service ${serviceName} is already registered`);
        }

        try {
            // サービスアダプターの作成
            const service = await this.serviceFactory.createService(serviceName, config);

            // イベントリスナーの設定
            this.setupServiceEventHandlers(service);

            // サービスの初期化
            await service.initialize(config);

            // 認証設定が提供されている場合は認証
            if (authConfig || this.config.auth?.[serviceName]) {
                const auth = authConfig || this.config.auth?.[serviceName];
                if (auth) {
                    await service.authenticate(auth);
                }
            }

            // サービスの接続
            await service.connect();

            // サービスの登録
            this.registry.services.set(serviceName, service);
            if (config) {
                this.registry.configs.set(serviceName, config);
            }

            // ヘルスモニタリングの開始
            this.startHealthMonitoring(serviceName);

            // 有効な場合は自動更新の開始
            if (this.config.display.autoRefresh) {
                this.startAutoRefresh(serviceName);
            }

            this.emit('serviceAdded', serviceName);
        } catch (error) {
            this.emit('error', error);
            throw new Error(`Failed to add service ${serviceName}: ${error}`);
        }
    }

    /**
     * サービスの削除
     */
    async removeService(serviceName: string): Promise<void> {
        const service = this.registry.services.get(serviceName);
        if (!service) {
            return;
        }

        try {
            // 自動更新の停止
            this.stopAutoRefresh(serviceName);

            // サービスの切断
            await service.disconnect();

            // レジストリから削除
            this.registry.services.delete(serviceName);
            this.registry.configs.delete(serviceName);
            this.registry.health.delete(serviceName);

            this.emit('serviceRemoved', serviceName);
        } catch (error) {
            this.emit('error', error);
            throw new Error(`Failed to remove service ${serviceName}: ${error}`);
        }
    }

    /**
     * 特定のサービスのダッシュボードデータを取得
     */
    async getServiceDashboardData(
        serviceName: string,
        options?: DashboardDataOptions
    ): Promise<ServiceDashboardData> {
        const service = this.registry.services.get(serviceName);
        if (!service) {
            throw new Error(`Service ${serviceName} not found`);
        }

        return service.getDashboardData(options);
    }

    /**
     * 全サービスの集約されたダッシュボードデータを取得
     */
    async getMultiServiceDashboardData(
        options?: DashboardDataOptions
    ): Promise<MultiServiceDashboardData> {
        const serviceData: Record<string, ServiceDashboardData> = {};
        const errors: string[] = [];

        // 全サービスからデータを収集
        for (const [serviceName, service] of this.registry.services) {
            try {
                serviceData[serviceName] = await service.getDashboardData(options);
            } catch (error) {
                errors.push(`${serviceName}: ${error}`);
                // 他のサービスを続行
            }
        }

        // 集約されたメトリクスを生成
        const aggregated = this.aggregateMetrics(serviceData);

        // Generate insights
        const insights = this.generateInsights(serviceData, aggregated);

        return {
            timestamp: Date.now(),
            services: serviceData,
            aggregated,
            insights,
        };
    }

    /**
     * Get metrics for a specific service
     */
    async getServiceMetrics(
        serviceName: string,
        options?: MetricsOptions
    ): Promise<ServiceMetrics> {
        const service = this.registry.services.get(serviceName);
        if (!service) {
            throw new Error(`Service ${serviceName} not found`);
        }

        return service.getMetrics(options);
    }

    /**
     * Get logs from a specific service
     */
    async *getServiceLogs(serviceName: string, options?: LogOptions): AsyncIterable<LogEntry> {
        const service = this.registry.services.get(serviceName);
        if (!service) {
            throw new Error(`Service ${serviceName} not found`);
        }

        yield* service.getLogs(options);
    }

    /**
     * Get logs from multiple services
     */
    async *getMultiServiceLogs(
        serviceNames?: string[],
        options?: LogOptions
    ): AsyncIterable<LogEntry & { service: string }> {
        const services = serviceNames || Array.from(this.registry.services.keys());

        // Create async iterators for each service
        const iterators = services.map(
            async function* (this: DashboardOrchestrator, serviceName: string) {
                const service = this.registry.services.get(serviceName);
                if (service) {
                    for await (const log of service.getLogs(options)) {
                        yield { ...log, service: serviceName };
                    }
                }
            }.bind(this)
        );

        // Merge logs from all services (simple time-based ordering)
        const buffer: (LogEntry & { service: string })[] = [];

        for (const iterator of iterators) {
            for await (const log of iterator) {
                buffer.push(log);
            }
        }

        // Sort by timestamp and yield
        buffer.sort((a, b) => a.timestamp - b.timestamp);
        for (const log of buffer) {
            yield log;
        }
    }

    /**
     * Execute an action on a specific service
     */
    async executeServiceAction(serviceName: string, action: ServiceAction): Promise<ActionResult> {
        const service = this.registry.services.get(serviceName);
        if (!service) {
            throw new Error(`Service ${serviceName} not found`);
        }

        return service.executeAction(action);
    }

    /**
     * Get status of all services
     */
    getServicesStatus(): Record<string, ServiceStatus> {
        const status: Record<string, ServiceStatus> = {};

        for (const [serviceName, service] of this.registry.services) {
            status[serviceName] = service.getStatus();
        }

        return status;
    }

    /**
     * Get health status of all services
     */
    getServicesHealth(): Record<string, HealthStatus> {
        const health: Record<string, HealthStatus> = {};

        for (const [serviceName, healthStatus] of this.registry.health) {
            health[serviceName] = healthStatus;
        }

        return health;
    }

    /**
     * Get list of registered services
     */
    getRegisteredServices(): string[] {
        return Array.from(this.registry.services.keys());
    }

    /**
     * Check if a service is registered
     */
    hasService(serviceName: string): boolean {
        return this.registry.services.has(serviceName);
    }

    /**
     * Shutdown all services and cleanup
     */
    async shutdown(): Promise<void> {
        // Stop all auto-refresh timers
        for (const timer of this.refreshTimers.values()) {
            clearInterval(timer);
        }
        this.refreshTimers.clear();

        // Disconnect all services
        const disconnectPromises = Array.from(this.registry.services.values()).map((service) =>
            service.disconnect().catch((error) => this.emit('error', error))
        );

        await Promise.all(disconnectPromises);

        // Clear registry
        this.registry.services.clear();
        this.registry.configs.clear();
        this.registry.health.clear();

        this.isInitialized = false;
        this.emit('shutdown');
    }

    // Private helper methods

    private setupEventHandlers(): void {
        // Handle unhandled errors
        this.on('error', (error) => {
            console.error('Dashboard orchestrator error:', error);
        });
    }

    private setupServiceEventHandlers(service: ServiceAdapter): void {
        // Forward service events with service name
        service.on('connection:changed', (status) => {
            this.emit('service:connection', service.name, status);
        });

        service.on('auth:changed', (status) => {
            this.emit('service:auth', service.name, status);
        });

        service.on('dashboard:updated', (data) => {
            this.emit('service:dashboardUpdate', service.name, data);
        });

        service.on('log:entry', (entry) => {
            this.emit('service:logEntry', service.name, entry);
        });

        service.on('metrics:updated', (metrics) => {
            this.emit('service:metricsUpdate', service.name, metrics);
        });

        service.on('resource:changed', (resource) => {
            this.emit('service:resourceChange', service.name, resource);
        });

        service.on('health:changed', (health) => {
            this.registry.health.set(service.name, health);
            this.emit('service:healthChange', service.name, health);
        });

        service.on('error', (error) => {
            this.emit('service:error', service.name, error);
        });
    }

    private async startHealthMonitoring(serviceName: string): Promise<void> {
        const service = this.registry.services.get(serviceName);
        if (!service) {
            return;
        }

        const checkHealth = async () => {
            try {
                const health = await service.healthCheck();
                this.registry.health.set(serviceName, health);
                this.emit('service:healthCheck', serviceName, health);
            } catch (error) {
                this.emit('service:error', serviceName, error);
            }
        };

        // Initial health check
        await checkHealth();

        // Schedule periodic health checks
        const healthTimer = setInterval(checkHealth, 30000); // Every 30 seconds
        this.refreshTimers.set(`health:${serviceName}`, healthTimer);
    }

    private startAutoRefresh(serviceName: string): void {
        const refreshData = async () => {
            try {
                const data = await this.getServiceDashboardData(serviceName);
                this.emit('service:autoRefresh', serviceName, data);
            } catch (error) {
                this.emit('service:error', serviceName, error);
            }
        };

        const timer = setInterval(refreshData, this.config.refreshInterval);
        this.refreshTimers.set(`refresh:${serviceName}`, timer);
    }

    private stopAutoRefresh(serviceName: string): void {
        const timer = this.refreshTimers.get(`refresh:${serviceName}`);
        if (timer) {
            clearInterval(timer);
            this.refreshTimers.delete(`refresh:${serviceName}`);
        }

        const healthTimer = this.refreshTimers.get(`health:${serviceName}`);
        if (healthTimer) {
            clearInterval(healthTimer);
            this.refreshTimers.delete(`health:${serviceName}`);
        }
    }

    private aggregateMetrics(serviceData: Record<string, ServiceDashboardData>): AggregatedMetrics {
        let totalResources = 0;
        let totalErrors = 0;
        let avgResponseTime = 0;
        let totalThroughput = 0;
        let combinedErrorRate = 0;
        let healthyServices = 0;
        let totalServices = 0;

        for (const [serviceName, data] of Object.entries(serviceData)) {
            totalServices++;

            // リソースをカウント（これはサービス固有である必要がある）
            if (data.resources && Array.isArray(data.resources)) {
                totalResources += data.resources.length;
            }

            // Aggregate metrics if available
            if (data.metrics) {
                const metrics = data.metrics as Record<string, unknown>;
                if (metrics.performance && typeof metrics.performance === 'object') {
                    const perf = metrics.performance as Record<string, unknown>;
                    avgResponseTime += (perf.avgResponseTime as number) || 0;
                    totalThroughput += (perf.throughput as number) || 0;
                    combinedErrorRate += (perf.errorRate as number) || 0;
                }
                if (metrics.errors && typeof metrics.errors === 'object') {
                    const errors = metrics.errors as Record<string, unknown>;
                    totalErrors += (errors.totalErrors as number) || 0;
                }
            }

            // Check health
            const health = this.registry.health.get(serviceName);
            if (health?.status === 'healthy') {
                healthyServices++;
            }
        }

        // Calculate averages
        if (totalServices > 0) {
            avgResponseTime /= totalServices;
            combinedErrorRate /= totalServices;
        }

        // Determine overall health
        let overallHealth: 'healthy' | 'degraded' | 'unhealthy';
        const healthRatio = healthyServices / totalServices;
        if (healthRatio >= 0.8) {
            overallHealth = 'healthy';
        } else if (healthRatio >= 0.5) {
            overallHealth = 'degraded';
        } else {
            overallHealth = 'unhealthy';
        }

        return {
            totalResources,
            totalErrors,
            overallHealth,
            performance: {
                avgResponseTime,
                totalThroughput,
                combinedErrorRate,
            },
        };
    }

    private generateInsights(
        serviceData: Record<string, ServiceDashboardData>,
        aggregated: AggregatedMetrics
    ): DashboardInsight[] {
        const insights: DashboardInsight[] = [];

        // Overall health insight
        if (aggregated.overallHealth === 'unhealthy') {
            insights.push({
                type: 'error',
                title: 'System Health Critical',
                message: 'Multiple services are experiencing issues',
                services: Object.keys(serviceData),
                priority: 'critical',
                actions: ['Check service logs', 'Verify connectivity', 'Review recent changes'],
            });
        } else if (aggregated.overallHealth === 'degraded') {
            insights.push({
                type: 'warning',
                title: 'System Health Degraded',
                message: 'Some services are not performing optimally',
                services: Object.keys(serviceData),
                priority: 'high',
                actions: ['Monitor service metrics', 'Check for resource constraints'],
            });
        }

        // High error rate insight
        if (aggregated.performance.combinedErrorRate > 5) {
            insights.push({
                type: 'warning',
                title: 'High Error Rate Detected',
                message: `Average error rate is ${aggregated.performance.combinedErrorRate.toFixed(2)}%`,
                services: Object.keys(serviceData),
                priority: 'high',
                actions: ['Review error logs', 'Check API limits', 'Verify configurations'],
            });
        }

        // Performance insight
        if (aggregated.performance.avgResponseTime > 1000) {
            insights.push({
                type: 'warning',
                title: 'Slow Response Times',
                message: `Average response time is ${aggregated.performance.avgResponseTime.toFixed(0)}ms`,
                services: Object.keys(serviceData),
                priority: 'medium',
                actions: [
                    'Check network connectivity',
                    'Review service performance',
                    'Consider caching',
                ],
            });
        }

        return insights;
    }

    /**
     * Get list of registered services
     */
    getServices(): string[] {
        return Array.from(this.registry.services.keys());
    }

    /**
     * Get a specific service adapter
     */
    getService(name: string): ServiceAdapter | undefined {
        return this.registry.services.get(name);
    }

    /**
     * Stop the orchestrator and disconnect all services
     */
    async stop(): Promise<void> {
        // Disconnect all services
        for (const [name, service] of this.registry.services) {
            try {
                await service.disconnect();
            } catch (error) {
                this.emit(ORCHESTRATOR_EVENTS.ERROR, {
                    service: name,
                    error: error instanceof Error ? error : new Error(String(error)),
                });
            }
        }

        // Clear registry
        this.registry.services.clear();
        this.registry.configs.clear();
        this.registry.health.clear();

        // Emit stopped event
        this.emit(ORCHESTRATOR_EVENTS.STOPPED);
    }
}

// Events emitted by the orchestrator
export const ORCHESTRATOR_EVENTS = {
    INITIALIZED: 'initialized',
    SERVICE_ADDED: 'serviceAdded',
    SERVICE_REMOVED: 'serviceRemoved',
    SERVICE_CONNECTION: 'service:connection',
    SERVICE_AUTH: 'service:auth',
    SERVICE_DASHBOARD_UPDATE: 'service:dashboardUpdate',
    SERVICE_LOG_ENTRY: 'service:logEntry',
    SERVICE_METRICS_UPDATE: 'service:metricsUpdate',
    SERVICE_RESOURCE_CHANGE: 'service:resourceChange',
    SERVICE_HEALTH_CHANGE: 'service:healthChange',
    SERVICE_ERROR: 'service:error',
    SERVICE_HEALTH_CHECK: 'service:healthCheck',
    SERVICE_AUTO_REFRESH: 'service:autoRefresh',
    SHUTDOWN: 'shutdown',
    STOPPED: 'stopped',
    ERROR: 'error',
} as const;
