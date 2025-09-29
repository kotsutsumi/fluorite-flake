/**
 * 利用可能なサービスとそのメタデータを管理するサービスレジストリ
 * サービスの分類、推奨、設定検証機能を提供
 */

import type { ServiceCapabilities, ServiceConfig } from '../base-service-adapter/index.js';
import { DefaultServiceFactory } from './DefaultServiceFactory.js';
import { SERVICE_INFO } from './constants.js';

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
                const propSchema = schema as { required?: boolean; type?: string };

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
