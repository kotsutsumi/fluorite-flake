/**
 * サービスファクトリー
 *
 * サービスアダプターインスタンスを作成および管理します。
 * 利用可能なサービスとその機能のレジストリを提供します。
 */

import type {
    ServiceFactory as IServiceFactory,
    ServiceAdapter,
    ServiceCapabilities,
    ServiceConfig,
    ServiceInfo,
} from './base-service-adapter.js';

// サービスアダプターのインポート（パフォーマンス向上のための動的インポート）
const SERVICE_MODULES = {
    vercel: () => import('./adapters/vercel-adapter.js'),
    cloudflare: () => import('./adapters/cloudflare-adapter.js'),
    supabase: () => import('./adapters/supabase-adapter.js'),
    turso: () => import('./adapters/turso-adapter.js'),
    aws: () => import('./adapters/aws-adapter.js'),
    github: () => import('./adapters/github-adapter.js'),
} as const;

type SupportedService = keyof typeof SERVICE_MODULES;

// 全アダプターのサービスメタデータ
const SERVICE_INFO: Record<SupportedService, ServiceInfo> = {
    vercel: {
        name: 'vercel',
        displayName: 'Vercel',
        description: 'Vercel deployment platform for frontend applications',
        capabilities: {
            realTimeUpdates: true,
            logStreaming: true,
            metricsHistory: true,
            resourceManagement: true,
            multiProject: true,
            deployments: true,
            analytics: true,
            fileOperations: true,
            database: false,
            userManagement: false,
        },
        authMethods: ['token'],
        configSchema: {
            properties: {
                team: { type: 'string', description: 'Team/organization ID' },
                project: { type: 'string', description: 'Default project ID' },
                timeout: { type: 'number', default: 30000 },
            },
        },
    },

    cloudflare: {
        name: 'cloudflare',
        displayName: 'Cloudflare',
        description: 'Cloudflare edge computing and CDN platform',
        capabilities: {
            realTimeUpdates: true,
            logStreaming: true,
            metricsHistory: true,
            resourceManagement: true,
            multiProject: false,
            deployments: true,
            analytics: true,
            fileOperations: true,
            database: true,
            userManagement: false,
        },
        authMethods: ['token'],
        configSchema: {
            properties: {
                accountId: { type: 'string', description: 'Cloudflare account ID' },
                timeout: { type: 'number', default: 30000 },
            },
        },
    },

    supabase: {
        name: 'supabase',
        displayName: 'Supabase',
        description: 'Open source Firebase alternative with PostgreSQL database',
        capabilities: {
            realTimeUpdates: true,
            logStreaming: true,
            metricsHistory: true,
            resourceManagement: true,
            multiProject: true,
            deployments: true,
            analytics: true,
            fileOperations: true,
            database: true,
            userManagement: true,
        },
        authMethods: ['token'],
        configSchema: {
            properties: {
                projectId: { type: 'string', description: 'Supabase project ID' },
                apiUrl: { type: 'string', description: 'API endpoint URL' },
                timeout: { type: 'number', default: 30000 },
            },
        },
    },

    turso: {
        name: 'turso',
        displayName: 'Turso',
        description: 'Distributed SQLite database platform',
        capabilities: {
            realTimeUpdates: true,
            logStreaming: false,
            metricsHistory: true,
            resourceManagement: true,
            multiProject: false,
            deployments: false,
            analytics: true,
            fileOperations: false,
            database: true,
            userManagement: false,
        },
        authMethods: ['token', 'login'],
        configSchema: {
            properties: {
                organization: { type: 'string', description: 'Organization name' },
                timeout: { type: 'number', default: 30000 },
            },
        },
    },

    aws: {
        name: 'aws',
        displayName: 'AWS',
        description: 'Amazon Web Services cloud platform',
        capabilities: {
            realTimeUpdates: false,
            logStreaming: true,
            metricsHistory: true,
            resourceManagement: true,
            multiProject: true,
            deployments: true,
            analytics: true,
            fileOperations: true,
            database: true,
            userManagement: true,
        },
        authMethods: ['credentials', 'profile', 'role'],
        configSchema: {
            properties: {
                region: { type: 'string', description: 'AWS region', default: 'us-east-1' },
                profile: { type: 'string', description: 'AWS profile name' },
                timeout: { type: 'number', default: 30000 },
            },
        },
    },

    github: {
        name: 'github',
        displayName: 'GitHub',
        description: 'GitHub repository and collaboration platform',
        capabilities: {
            realTimeUpdates: true,
            logStreaming: true,
            metricsHistory: true,
            resourceManagement: true,
            multiProject: true,
            deployments: true,
            analytics: true,
            fileOperations: true,
            database: false,
            userManagement: true,
        },
        authMethods: ['token', 'oauth'],
        configSchema: {
            properties: {
                organization: { type: 'string', description: 'GitHub organization' },
                repository: { type: 'string', description: 'Default repository' },
                timeout: { type: 'number', default: 30000 },
            },
        },
    },
};

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
            return this.instances.get(cacheKey)!;
        }

        try {
            // サービスアダプターの動的インポート
            const module = await SERVICE_MODULES[serviceType]();
            const AdapterClass =
                module.default || (module as any)[this.getAdapterClassName(serviceType)];

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

/**
 * 利用可能なサービスとそのメタデータを管理するサービスレジストリ
 */
export class ServiceRegistry {
    private static instance: ServiceRegistry;
    private factory: DefaultServiceFactory;

    private constructor() {
        this.factory = new DefaultServiceFactory();
    }

    static getInstance(): ServiceRegistry {
        if (!ServiceRegistry.instance) {
            ServiceRegistry.instance = new ServiceRegistry();
        }
        return ServiceRegistry.instance;
    }

    /**
     * サービスファクトリーを取得
     */
    getFactory(): DefaultServiceFactory {
        return this.factory;
    }

    /**
     * カテゴリ別にグループ化された利用可能なサービスを取得
     */
    getServicesByCategory(): Record<string, string[]> {
        const categories: Record<string, string[]> = {
            deployment: [],
            database: [],
            analytics: [],
            storage: [],
            compute: [],
            collaboration: [],
        };

        for (const [name, info] of Object.entries(SERVICE_INFO)) {
            if (info.capabilities.deployments) {
                categories.deployment.push(name);
            }
            if (info.capabilities.database) {
                categories.database.push(name);
            }
            if (info.capabilities.analytics) {
                categories.analytics.push(name);
            }
            if (info.capabilities.fileOperations) {
                categories.storage.push(name);
            }
            if (name === 'aws' || name === 'cloudflare') {
                categories.compute.push(name);
            }
            if (name === 'github') {
                categories.collaboration.push(name);
            }
        }

        return categories;
    }

    /**
     * 必要な機能に基づいてサービスの推奨事項を取得
     */
    getServiceRecommendations(requirements: Partial<ServiceCapabilities>): string[] {
        const recommendations: Array<{ name: string; score: number }> = [];

        for (const [name, info] of Object.entries(SERVICE_INFO)) {
            let score = 0;
            let total = 0;

            for (const [capability, required] of Object.entries(requirements)) {
                if (required) {
                    total++;
                    if (info.capabilities[capability as keyof ServiceCapabilities]) {
                        score++;
                    }
                }
            }

            if (total > 0) {
                recommendations.push({
                    name,
                    score: score / total,
                });
            }
        }

        return recommendations
            .filter((r) => r.score > 0.5) // 最低50%のマッチ
            .sort((a, b) => b.score - a.score)
            .map((r) => r.name);
    }

    /**
     * サービス設定を検証
     */
    validateServiceConfig(
        type: string,
        config: ServiceConfig
    ): { valid: boolean; errors: string[] } {
        const info = this.factory.getServiceInfo(type);
        if (!info) {
            return { valid: false, errors: [`Unknown service type: ${type}`] };
        }

        const errors: string[] = [];

        // 基本的な検証 - JSONスキーマ検証で強化できる
        if (info.configSchema?.properties) {
            for (const [key, schema] of Object.entries(info.configSchema.properties)) {
                const value = config[key];
                const propSchema = schema as any;

                if (propSchema.required && (value === undefined || value === null)) {
                    errors.push(`Required property '${key}' is missing`);
                }

                if (value !== undefined && propSchema.type) {
                    const actualType = typeof value;
                    if (actualType !== propSchema.type) {
                        errors.push(
                            `Property '${key}' should be ${propSchema.type}, got ${actualType}`
                        );
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

// デフォルトファクトリーインスタンスをエクスポート
export const serviceFactory = new DefaultServiceFactory();

// 外部使用用のサービス情報をエクスポート
export { SERVICE_INFO, type SupportedService };
