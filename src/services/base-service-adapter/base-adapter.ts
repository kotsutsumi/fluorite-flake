/**
 * ベースサービスアダプター実装
 *
 * 全てのサービスアダプターが継承する抽象基底クラスを提供します。
 */

import { EventEmitter } from 'node:events';
import type {
    ActionResult,
    AuthConfig,
    DashboardDataOptions,
    EventCallback,
    HealthStatus,
    LogEntry,
    LogOptions,
    MetricsOptions,
    Resource,
    ServiceAction,
    ServiceAdapter,
    ServiceCapabilities,
    ServiceConfig,
    ServiceDashboardData,
    ServiceMetrics,
    ServiceStatus,
} from './types.js';
import { SERVICE_EVENTS } from './constants.js';

// ベースアダプター抽象クラス
export abstract class BaseServiceAdapter extends EventEmitter implements ServiceAdapter {
    abstract readonly name: string;
    abstract readonly displayName: string;
    abstract readonly version: string;
    abstract readonly capabilities: ServiceCapabilities;

    protected config: ServiceConfig = {};
    protected authConfig?: AuthConfig;
    protected _status: ServiceStatus = {
        connected: false,
        authenticated: false,
    };

    constructor(config?: ServiceConfig) {
        super();
        if (config) {
            this.config = { ...config };
        }
    }

    // 実装しなければならない抽象メソッド
    abstract initialize(config?: ServiceConfig): Promise<void>;
    abstract authenticate(authConfig: AuthConfig): Promise<boolean>;
    abstract isAuthenticated(): Promise<boolean>;
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract healthCheck(): Promise<HealthStatus>;
    abstract getDashboardData(options?: DashboardDataOptions): Promise<ServiceDashboardData>;
    abstract getMetrics(options?: MetricsOptions): Promise<ServiceMetrics>;
    abstract getLogs(options?: LogOptions): AsyncIterable<LogEntry>;
    abstract listResources(type?: string): Promise<Resource[]>;
    abstract getResource(id: string, type: string): Promise<Resource | null>;
    abstract executeAction(action: ServiceAction): Promise<ActionResult>;

    // ステータス管理のデフォルト実装
    getStatus(): ServiceStatus {
        return { ...this._status };
    }

    // イベント購読メソッド
    subscribe(event: string, callback: EventCallback): void {
        this.on(event, callback);
    }

    unsubscribe(event: string, callback?: EventCallback): void {
        if (callback) {
            this.off(event, callback);
        } else {
            this.removeAllListeners(event);
        }
    }

    protected updateStatus(updates: Partial<ServiceStatus>): void {
        const oldStatus = { ...this._status };
        this._status = { ...this._status, ...updates };

        if (oldStatus.connected !== this._status.connected) {
            this.emit(SERVICE_EVENTS.CONNECTION_CHANGED, this._status);
        }

        if (oldStatus.authenticated !== this._status.authenticated) {
            this.emit(SERVICE_EVENTS.AUTH_CHANGED, this._status);
        }
    }

    protected emitError(error: Error | string): void {
        const errorObj = error instanceof Error ? error : new Error(error);
        this.emit(SERVICE_EVENTS.ERROR, errorObj);
    }

    protected emitDashboardUpdate(data: ServiceDashboardData): void {
        this.emit(SERVICE_EVENTS.DASHBOARD_UPDATED, data);
    }

    protected emitLogEntry(entry: LogEntry): void {
        this.emit(SERVICE_EVENTS.LOG_ENTRY, entry);
    }

    protected emitMetricsUpdate(metrics: ServiceMetrics): void {
        this.emit(SERVICE_EVENTS.METRICS_UPDATED, metrics);
    }

    protected emitResourceChange(resource: Resource): void {
        this.emit(SERVICE_EVENTS.RESOURCE_CHANGED, resource);
    }

    protected emitHealthChange(health: HealthStatus): void {
        this.emit(SERVICE_EVENTS.HEALTH_CHANGED, health);
    }
}
