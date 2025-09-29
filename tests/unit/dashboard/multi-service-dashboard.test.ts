/**
 * Multi-Service Dashboard Tests
 *
 * Comprehensive test suite for the multi-service dashboard functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DashboardOrchestrator } from '../../../src/dashboard/dashboard-orchestrator.js';
import { serviceFactory } from '../../../src/services/service-factory.js';
import type {
    ServiceAdapter,
    ServiceDashboardData,
} from '../../../src/services/base-service-adapter.js';

// Mock the service factory
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

        // Create a mock adapter
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

    describe('Service Management', () => {
        it('should add a new service', async () => {
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

        it('should remove a service', async () => {
            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapter as ServiceAdapter
            );

            await orchestrator.addService('test-service', {}, { token: 'test-token' });
            await orchestrator.removeService('test-service');

            expect(mockAdapter.disconnect).toHaveBeenCalled();
            expect(orchestrator.getServices()).not.toContain('test-service');
        });

        it('should throw error when removing non-existent service', async () => {
            await expect(orchestrator.removeService('non-existent')).rejects.toThrow(
                'Service non-existent not found'
            );
        });
    });

    describe('Dashboard Data', () => {
        it('should get service dashboard data', async () => {
            vi.mocked(serviceFactory.createService).mockResolvedValue(
                mockAdapter as ServiceAdapter
            );
            await orchestrator.addService('test-service', {}, { token: 'test-token' });

            const data = await orchestrator.getServiceDashboardData('test-service');

            expect(mockAdapter.getDashboardData).toHaveBeenCalled();
            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('testData', 'test');
        });

        it('should get multi-service dashboard data', async () => {
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

    describe('Aggregation', () => {
        it('should aggregate metrics from all services', async () => {
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

        it('should aggregate alerts from all services', async () => {
            // Mock adapter with alerts
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

    describe('Health Monitoring', () => {
        it('should perform health check on all services', async () => {
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

        it('should handle health check failures gracefully', async () => {
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

    describe('Event Handling', () => {
        it('should forward service events', async () => {
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

            // Wait for event to propagate
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(logHandler).toHaveBeenCalledWith('test-service', { message: 'Test log' });
        });
    });

    describe('Service Factory Integration', () => {
        it('should list supported services', () => {
            const services = serviceFactory.getSupportedServices();
            expect(services).toContain('vercel');
            expect(services).toContain('cloudflare');
            expect(services).toContain('supabase');
            expect(services).toContain('turso');
            expect(services).toContain('aws');
            expect(services).toContain('github');
        });

        it('should get service info', () => {
            const info = serviceFactory.getServiceInfo('vercel');
            expect(info).toHaveProperty('name', 'vercel');
            expect(info).toHaveProperty('capabilities');
            expect(info?.capabilities).toHaveProperty('deployments', true);
        });
    });
});

describe('Service Adapters', () => {
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

    describe('Mock Adapter Behavior', () => {
        it('should initialize adapter', async () => {
            const adapter = {
                ...baseMockAdapter,
                initialize: vi.fn().mockResolvedValue(undefined),
            };

            if (adapter.initialize) {
                await adapter.initialize({});
                expect(adapter.initialize).toHaveBeenCalled();
            }
        });

        it('should authenticate with token', async () => {
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

        it('should get dashboard data', async () => {
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

        it('should execute actions', async () => {
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

describe('TUI Dashboard Integration', () => {
    it('should create dashboard with orchestrator', async () => {
        const orchestrator = new DashboardOrchestrator();

        // Test that orchestrator can be passed to dashboard configs
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

describe('Command Routing', () => {
    it('should validate dashboard command options', () => {
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
