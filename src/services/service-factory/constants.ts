/**
 * サービスファクトリー定数
 * サービスモジュール定義とメタデータを提供
 */

import type { ServiceInfo } from '../base-service-adapter/index.js';

// サービスアダプターのインポート（パフォーマンス向上のための動的インポート）
export const SERVICE_MODULES = {
    vercel: () => import('../adapters/vercel-adapter/index.js'),
    cloudflare: () => import('../adapters/cloudflare-adapter/index.js'),
    supabase: () => import('../adapters/supabase-adapter/index.js'),
    turso: () => import('../adapters/turso-adapter/index.js'),
    aws: () => import('../adapters/aws-adapter/index.js'),
    github: () => import('../adapters/github-adapter/index.js'),
} as const;

export type SupportedService = keyof typeof SERVICE_MODULES;

// 全アダプターのサービスメタデータ
export const SERVICE_INFO: Record<SupportedService, ServiceInfo> = {
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
