/**
 * デフォルトサービスファクトリー実装
 * サービスアダプターインスタンスの作成および管理を行う
 */

import type {
    ServiceFactory as IServiceFactory,
    ServiceAdapter,
    ServiceCapabilities,
    ServiceConfig,
    ServiceInfo,
} from '../base-service-adapter/index.js';
import { SERVICE_INFO, SERVICE_MODULES, type SupportedService } from './constants.js';

/**
 * デフォルトサービスファクトリー実装
 */
export class DefaultServiceFactory implements IServiceFactory {
    private instances: Map<string, ServiceAdapter> = new Map();

    /**
     * サービスアダプターインスタンスを作成
     */
    async createService(type: string, config?: ServiceConfig): Promise<ServiceAdapter> {
        if (!this.isSupported(type)) {
            throw new Error(`Unsupported service type: ${type}`);
        }

        const serviceType = type as SupportedService;
        const cacheKey = `${type}:${JSON.stringify(config || {})}`;

        // ユニークインスタンス用に設定されていない場合、キャッシュされたインスタンスが存在すればそれを返す
        if (this.instances.has(cacheKey) && !config?.uniqueInstance) {
            const cachedInstance = this.instances.get(cacheKey);
            if (cachedInstance) {
                return cachedInstance;
            }
        }

        try {
            // サービスアダプターの動的インポート
            const module = await SERVICE_MODULES[serviceType]();
            const AdapterClass =
                module.default ||
                (module as Record<string, unknown>)[this.getAdapterClassName(serviceType)];

            if (!AdapterClass) {
                throw new Error(`No adapter class found for service ${type}`);
            }

            // アダプターインスタンスを作成
            const adapter = new AdapterClass(config);

            // インスタンスをキャッシュ
            this.instances.set(cacheKey, adapter);

            return adapter;
        } catch (error) {
            throw new Error(`Failed to create ${type} service adapter: ${error}`);
        }
    }

    /**
     * サポートされているサービスタイプのリストを取得
     */
    getSupportedServices(): string[] {
        return Object.keys(SERVICE_INFO);
    }

    /**
     * サービス情報を取得
     */
    getServiceInfo(type: string): ServiceInfo | null {
        return SERVICE_INFO[type as SupportedService] || null;
    }

    /**
     * 全サービス情報を取得
     */
    getAllServiceInfo(): Record<string, ServiceInfo> {
        return { ...SERVICE_INFO };
    }

    /**
     * サービスタイプがサポートされているかどうかをチェック
     */
    isSupported(type: string): boolean {
        return type in SERVICE_INFO;
    }

    /**
     * サービス機能を取得
     */
    getServiceCapabilities(type: string): ServiceCapabilities | null {
        const info = this.getServiceInfo(type);
        return info?.capabilities || null;
    }

    /**
     * 機能でサービスをフィルター
     */
    getServicesByCapability(capability: keyof ServiceCapabilities): string[] {
        return Object.entries(SERVICE_INFO)
            .filter(([, info]) => info.capabilities[capability])
            .map(([name]) => name);
    }

    /**
     * キャッシュされたインスタンスをクリア
     */
    clearCache(): void {
        this.instances.clear();
    }

    /**
     * 特定のキャッシュされたインスタンスを削除
     */
    removeCachedInstance(type: string, config?: ServiceConfig): void {
        const cacheKey = `${type}:${JSON.stringify(config || {})}`;
        this.instances.delete(cacheKey);
    }

    // プライベートヘルパーメソッド

    private getAdapterClassName(serviceType: SupportedService): string {
        const capitalizedName = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
        return `${capitalizedName}Adapter`;
    }
}
