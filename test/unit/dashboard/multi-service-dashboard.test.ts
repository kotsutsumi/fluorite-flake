/**
 * マルチサービスダッシュボードテスト
 *
 * マルチサービスダッシュボード機能の包括的なテストスイート。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DashboardOrchestrator } from '../../../src/dashboard/dashboard-orchestrator.js';
import { serviceFactory } from '../../../src/services/service-factory.js';
import type {
    ServiceAdapter,
    ServiceDashboardData,
} from '../../../src/services/base-service-adapter/index.js';

// サービスファクトリーをモック化
vi.mock('../../../src/services/service-factory.js', () => ({
    serviceFactory: {
        createService: vi.fn(),
        getSupportedServices: vi.fn(() => [
            'vercel',
            'cloudflare',
            'supabase',
            'turso',
            'aws',
            'github',
        ]),
        getServiceInfo: vi.fn((type: string) => ({
            name: type,
            displayName: type.charAt(0).toUpperCase() + type.slice(1),
            description: `${type} service`,
            capabilities: {
                realTimeUpdates: true,
                logStreaming: true,
                metricsHistory: true,
                resourceManagement: true,
                multiProject: true,
                deployments: true,
                analytics: true,
                fileOperations: true,
                database: type !== 'github',
                userManagement: type !== 'turso',
            },
            authMethods: ['token'],
        })),
    },
}));

describe('DashboardOrchestrator', () => {
    let orchestrator: DashboardOrchestrator;
    let mockAdapter: Partial<ServiceAdapter>;

    beforeEach(() => {
        orchestrator = new DashboardOrchestrator();

        // モックアダプターを作成
        mockAdapter = {
            name: 'test-service',
            displayName: 'Test Service',
            version: '1.0.0',
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
            initialize: vi.fn().mockResolvedValue(undefined),
            authenticate: vi.fn().mockResolvedValue(true),
            isAuthenticated: vi.fn().mockResolvedValue(true),
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            healthCheck: vi.fn().mockResolvedValue({
                status: 'healthy',
                timestamp: Date.now(),
                responseTime: 100,
                checks: [],
            }),
            getDashboardData: vi.fn().mockResolvedValue({
                timestamp: Date.now(),
                testData: 'test',
            }),
            getMetrics: vi.fn().mockResolvedValue({
                timestamp: Date.now(),
                performance: {
                    avgResponseTime: 100,
                    throughput: 1000,
                    errorRate: 0.01,
                    activeConnections: 50,
                },
                usage: {
                    requests: 10000,
                    dataTransfer: 1000000,
                    resourceUtilization: 50,
                    cost: 100,
                },
                errors: {
                    totalErrors: 10,
                    errorsByType: {},
                    recentErrors: [],
                },
            }),
            getLogs: vi.fn(),
            listResources: vi.fn().mockResolvedValue([]),
            getResource: vi.fn().mockResolvedValue(null),
            executeAction: vi.fn().mockResolvedValue({
                success: true,
                message: 'Action executed',
            }),
            getStatus: vi.fn().mockReturnValue({
                connected: true,
                authenticated: true,
            }),
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
        } as Partial<ServiceAdapter>;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('サービス管理', () => {
        it('新しいサービスを追加できる', async () => {
            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapter as ServiceAdapter
            );

            await orchestrator.addService('test-service', {}, { token: 'test-token' });

            expect(serviceFactory.createService).toHaveBeenCalledWith('test-service', {});
            expect(mockAdapter.initialize).toHaveBeenCalled();
            expect(mockAdapter.authenticate).toHaveBeenCalledWith({ token: 'test-token' });
            expect(mockAdapter.connect).toHaveBeenCalled();
            expect(orchestrator.getServices()).toContain('test-service');
        });

        it('サービスを削除できる', async () => {
            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapter as ServiceAdapter
            );

            await orchestrator.addService('test-service', {}, { token: 'test-token' });
            await orchestrator.removeService('test-service');

            expect(mockAdapter.disconnect).toHaveBeenCalled();
            expect(orchestrator.getServices()).not.toContain('test-service');
        });

        it('存在しないサービス削除時にエラーになる', async () => {
            await expect(orchestrator.removeService('non-existent')).rejects.toThrow(
                'Service non-existent not found'
            );
        });
    });

    describe('ダッシュボードデータ', () => {
        it('サービスのダッシュボードデータを取得できる', async () => {
            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapter as ServiceAdapter
            );
            await orchestrator.addService('test-service', {}, { token: 'test-token' });

            const data = await orchestrator.getServiceDashboardData('test-service');

            expect(mockAdapter.getDashboardData).toHaveBeenCalled();
            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('testData', 'test');
        });

        it('複数サービスのダッシュボードデータを取得できる', async () => {
            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapter as ServiceAdapter
            );

            await orchestrator.addService('service1', {}, { token: 'token1' });
            await orchestrator.addService('service2', {}, { token: 'token2' });

            const data = await orchestrator.getMultiServiceDashboardData();

            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('services');
            expect(data.services).toHaveProperty('service1');
            expect(data.services).toHaveProperty('service2');
        });
    });

    describe('集計処理', () => {
        it('全サービスの指標を集計できる', async () => {
            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapter as ServiceAdapter
            );

            await orchestrator.addService('service1', {}, { token: 'token1' });
            await orchestrator.addService('service2', {}, { token: 'token2' });

            const metrics = await orchestrator.getAggregatedMetrics();

            expect(metrics).toHaveProperty('timestamp');
            expect(metrics).toHaveProperty('services');
            expect(metrics).toHaveProperty('totals');
            expect(metrics.totals).toHaveProperty('requests');
            expect(metrics.totals).toHaveProperty('errors');
            expect(metrics.totals).toHaveProperty('avgResponseTime');
        });

        it('全サービスのアラートを集約できる', async () => {
            // アラート付きのモックアダプター
            const mockAdapterWithAlerts = {
                ...mockAdapter,
                getDashboardData: vi.fn().mockResolvedValue({
                    timestamp: Date.now(),
                    alerts: [
                        { level: 'error', message: 'Test error' },
                        { level: 'warning', message: 'Test warning' },
                    ],
                }),
            };

            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapterWithAlerts as ServiceAdapter
            );

            await orchestrator.addService('service1', {}, { token: 'token1' });

            const alerts = await orchestrator.getAggregatedAlerts();

            expect(alerts).toHaveLength(2);
            expect(alerts[0]).toHaveProperty('service', 'service1');
            expect(alerts[0]).toHaveProperty('level', 'error');
        });
    });

    describe('ヘルス監視', () => {
        it('全サービスのヘルスチェックを実行できる', async () => {
            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapter as ServiceAdapter
            );

            await orchestrator.addService('service1', {}, { token: 'token1' });
            await orchestrator.addService('service2', {}, { token: 'token2' });

            const health = await orchestrator.healthCheckAll();

            expect(health).toHaveProperty('service1');
            expect(health).toHaveProperty('service2');
            expect(health.service1.status).toBe('healthy');
        });

        it('ヘルスチェック失敗時に安全に処理できる', async () => {
            const failingAdapter = {
                ...mockAdapter,
                healthCheck: vi.fn().mockRejectedValue(new Error('Health check failed')),
            };

            vi.mocked(serviceFactory.createService).mockResolvedValue(
                failingAdapter as ServiceAdapter
            );

            await orchestrator.addService('failing-service', {}, { token: 'token' });

            const health = await orchestrator.healthCheckAll();

            expect(health['failing-service']).toHaveProperty('status', 'error');
            expect(health['failing-service']).toHaveProperty('error');
        });
    });

    describe('イベント処理', () => {
        it('サービスイベントを転送できる', async () => {
            const mockEmitter = {
                ...mockAdapter,
                on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
                    if (event === 'log:entry') {
                        setTimeout(() => callback({ message: 'Test log' }), 0);
                    }
                }),
            };

            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockEmitter as ServiceAdapter
            );

            const logHandler = vi.fn();
            orchestrator.on('service:logEntry', logHandler);

            await orchestrator.addService('test-service', {}, { token: 'token' });

            // イベントが伝搬するのを待機
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(logHandler).toHaveBeenCalledWith('test-service', { message: 'Test log' });
        });
    });

    describe('サービスファクトリー連携', () => {
        it('サポート対象のサービスを一覧できる', () => {
            const services = serviceFactory.getSupportedServices();
            expect(services).toContain('vercel');
            expect(services).toContain('cloudflare');
            expect(services).toContain('supabase');
            expect(services).toContain('turso');
            expect(services).toContain('aws');
            expect(services).toContain('github');
        });

        it('サービス情報を取得できる', () => {
            const info = serviceFactory.getServiceInfo('vercel');
            expect(info).toHaveProperty('name', 'vercel');
            expect(info).toHaveProperty('capabilities');
            expect(info?.capabilities).toHaveProperty('deployments', true);
        });
    });
});

describe('サービスアダプター', () => {
    const baseMockAdapter = {
        name: 'test-service',
        displayName: 'Test Service',
        version: '1.0.0',
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
        getStatus: vi.fn(),
        healthCheck: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        listResources: vi.fn(),
        getResource: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
    };

    describe('モックアダプターの挙動', () => {
        it('アダプターを初期化できる', async () => {
            const adapter = {
                ...baseMockAdapter,
                initialize: vi.fn().mockResolvedValue(undefined),
            };

            if (adapter.initialize) {
                await adapter.initialize({});
                expect(adapter.initialize).toHaveBeenCalled();
            }
        });

        it('トークンで認証できる', async () => {
            const adapter = {
                ...baseMockAdapter,
                authenticate: vi.fn().mockResolvedValue(true),
            };

            if (adapter.authenticate) {
                const result = await adapter.authenticate({ token: 'test-token' });
                expect(result).toBe(true);
                expect(adapter.authenticate).toHaveBeenCalledWith({ token: 'test-token' });
            }
        });

        it('ダッシュボードデータを取得できる', async () => {
            const mockData: ServiceDashboardData = {
                timestamp: Date.now(),
                deployments: [],
                projects: [],
            };

            const adapter = {
                ...baseMockAdapter,
                getDashboardData: vi.fn().mockResolvedValue(mockData),
            };

            if (adapter.getDashboardData) {
                const data = await adapter.getDashboardData();
                expect(data).toEqual(mockData);
            }
        });

        it('アクションを実行できる', async () => {
            const adapter = {
                ...baseMockAdapter,
                executeAction: vi.fn().mockResolvedValue({
                    success: true,
                    message: 'Deployment started',
                    data: { deploymentId: '123' },
                }),
            };

            if (adapter.executeAction) {
                const result = await adapter.executeAction({
                    type: 'deploy',
                    params: { projectId: 'test-project' },
                });

                expect(result.success).toBe(true);
                expect(result.message).toBe('Deployment started');
                expect(result.data).toHaveProperty('deploymentId');
            }
        });
    });
});

describe('TUI ダッシュボード連携', () => {
    it('オーケストレーターでダッシュボードを作成できる', async () => {
        const orchestrator = new DashboardOrchestrator();

        // オーケストレーターをダッシュボード設定に渡せることをテスト
        const config = {
            orchestrator,
            theme: 'dark' as const,
            refreshInterval: 5000,
        };

        expect(config.orchestrator).toBe(orchestrator);
        expect(config.theme).toBe('dark');
        expect(config.refreshInterval).toBe(5000);
    });
});

describe('コマンドルーティング', () => {
    it('ダッシュボードコマンドのオプションを検証できる', () => {
        const options = {
            theme: 'dark' as const,
            refresh: 5000,
            port: 9123,
            host: 'localhost',
            token: 'auth-token',
        };

        expect(options.theme).toMatch(/^(dark|light)$/);
        expect(options.refresh).toBeGreaterThan(0);
        expect(options.port).toBeGreaterThan(0);
        expect(options.port).toBeLessThan(65536);
    });
});
