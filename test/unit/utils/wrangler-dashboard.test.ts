import { describe, expect, it, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import {
    WranglerDashboard,
    createWranglerDashboard,
    formatDashboardData,
    type WranglerDashboardData,
} from '../../../src/utils/wrangler-dashboard.js';

vi.mock('execa');

describe('WranglerDashboard', () => {
    let dashboard: WranglerDashboard;
    const mockExeca = vi.mocked(execa);

    beforeEach(() => {
        dashboard = new WranglerDashboard();
        vi.clearAllMocks();
    });

    describe('isAvailable', () => {
        it('should return true when wrangler is available', async () => {
            mockExeca.mockResolvedValue({
                stdout: '⛅️ wrangler 3.0.0',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.isAvailable();
            expect(result).toBe(true);
            expect(mockExeca).toHaveBeenCalledWith('wrangler', ['--version']);
        });

        it('should return false when wrangler is not available', async () => {
            mockExeca.mockRejectedValue(new Error('Command not found'));

            const result = await dashboard.isAvailable();
            expect(result).toBe(false);
        });
    });

    describe('getVersion', () => {
        it('should return version string when available', async () => {
            mockExeca.mockResolvedValue({
                stdout: '⛅️ wrangler 3.0.0',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.getVersion();
            expect(result).toBe('⛅️ wrangler 3.0.0');
        });

        it('should return null when command fails', async () => {
            mockExeca.mockRejectedValue(new Error('Command failed'));

            const result = await dashboard.getVersion();
            expect(result).toBeNull();
        });
    });

    describe('isAuthenticated', () => {
        it('should return true when authenticated', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'You are logged in as: user@example.com',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.isAuthenticated();
            expect(result).toBe(true);
        });

        it('should return false when not authenticated', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'You are not authenticated',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.isAuthenticated();
            expect(result).toBe(false);
        });
    });

    describe('whoami', () => {
        it('should parse email and account ID from output', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'You are logged in as: user@example.com\nAccount ID: 123456',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.whoami();
            expect(result).toEqual({
                email: 'user@example.com',
                accountId: '123456',
            });
        });

        it('should return null on error', async () => {
            mockExeca.mockRejectedValue(new Error('Not authenticated'));

            const result = await dashboard.whoami();
            expect(result).toBeNull();
        });
    });

    describe('listR2Buckets', () => {
        it('should parse bucket list from output', async () => {
            mockExeca.mockResolvedValue({
                stdout: `Name           Created        Location
----           -------        --------
my-bucket      2024-01-01     us-east-1
test-bucket    2024-01-02     eu-west-1`,
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.listR2Buckets();
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                name: 'my-bucket',
                created_on: '2024-01-01',
                location: 'us-east-1',
            });
            expect(result[1]).toEqual({
                name: 'test-bucket',
                created_on: '2024-01-02',
                location: 'eu-west-1',
            });
        });

        it('should return empty array on error', async () => {
            mockExeca.mockRejectedValue(new Error('R2 not available'));

            const result = await dashboard.listR2Buckets();
            expect(result).toEqual([]);
        });
    });

    describe('listKVNamespaces', () => {
        it('should parse KV namespace list from JSON output', async () => {
            mockExeca.mockResolvedValue({
                stdout: JSON.stringify([
                    { id: 'abc123', title: 'my-namespace', supports_url_encoding: true },
                    { id: 'def456', title: 'test-namespace' },
                ]),
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.listKVNamespaces();
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 'abc123',
                title: 'my-namespace',
                supports_url_encoding: true,
            });
        });

        it('should parse KV namespace list from text output', async () => {
            mockExeca.mockResolvedValue({
                stdout: `abc123: my-namespace
def456: test-namespace`,
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.listKVNamespaces();
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 'abc123',
                title: 'my-namespace',
            });
        });

        it('should return empty array on error', async () => {
            mockExeca.mockRejectedValue(new Error('KV not available'));

            const result = await dashboard.listKVNamespaces();
            expect(result).toEqual([]);
        });
    });

    describe('deployWorker', () => {
        it('should deploy with dry run by default', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'Deployment successful (dry run)',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.deployWorker({ name: 'my-worker' });
            expect(result).toEqual({
                success: true,
                message: 'Deployment successful (dry run)',
            });
            expect(mockExeca).toHaveBeenCalledWith('wrangler', [
                'deploy',
                '--dry-run',
                '--name',
                'my-worker',
            ]);
        });

        it('should handle deployment errors', async () => {
            mockExeca.mockRejectedValue({
                stderr: 'Deployment failed',
                message: 'Command failed',
            });

            const result = await dashboard.deployWorker();
            expect(result).toEqual({
                success: false,
                message: 'Deployment failed',
            });
        });
    });

    describe('createR2Bucket', () => {
        it('should create bucket successfully', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'Bucket created successfully',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.createR2Bucket('new-bucket');
            expect(result).toEqual({
                success: true,
                message: 'Bucket created successfully',
            });
            expect(mockExeca).toHaveBeenCalledWith('wrangler', [
                'r2',
                'bucket',
                'create',
                'new-bucket',
            ]);
        });

        it('should handle creation errors', async () => {
            mockExeca.mockRejectedValue({
                stderr: 'Bucket already exists',
                message: 'Command failed',
            });

            const result = await dashboard.createR2Bucket('existing-bucket');
            expect(result).toEqual({
                success: false,
                message: 'Bucket already exists',
            });
        });
    });

    describe('createKVNamespace', () => {
        it('should create namespace and extract ID', async () => {
            mockExeca.mockResolvedValue({
                stdout: 'Created namespace with id = "xyz789"',
                stderr: '',
            } as unknown as Awaited<ReturnType<typeof execa>>);

            const result = await dashboard.createKVNamespace('new-namespace');
            expect(result).toEqual({
                success: true,
                message: 'Created namespace with id = "xyz789"',
                id: 'xyz789',
            });
        });
    });

    describe('getDashboardData', () => {
        it('should aggregate all dashboard data', async () => {
            // Mock workers
            mockExeca.mockImplementation((_cmd, args) => {
                if (args?.includes('--dry-run')) {
                    return Promise.resolve({
                        stdout: 'Worker: my-worker',
                        stderr: '',
                    } as unknown as Awaited<ReturnType<typeof execa>>);
                }
                if (args?.[0] === 'r2' && args?.[1] === 'bucket') {
                    return Promise.resolve({
                        stdout: 'Name\n----\nmy-bucket',
                        stderr: '',
                    } as unknown as Awaited<ReturnType<typeof execa>>);
                }
                if (args?.[0] === 'kv:namespace') {
                    return Promise.resolve({
                        stdout: 'abc123: my-namespace',
                        stderr: '',
                    } as unknown as Awaited<ReturnType<typeof execa>>);
                }
                return Promise.reject(new Error('Unknown command'));
            });

            const result = await dashboard.getDashboardData();
            expect(result.workers).toHaveLength(1);
            expect(result.r2Buckets).toHaveLength(1);
            expect(result.kvNamespaces).toHaveLength(1);
            expect(result.durableObjects).toEqual([]);
            expect(result.deployments).toEqual([]);
        });
    });
});

describe('createWranglerDashboard', () => {
    it('should create a WranglerDashboard instance', () => {
        const dashboard = createWranglerDashboard();
        expect(dashboard).toBeInstanceOf(WranglerDashboard);
    });

    it('should accept custom wrangler path', () => {
        const dashboard = createWranglerDashboard('/custom/path/wrangler');
        expect(dashboard).toBeInstanceOf(WranglerDashboard);
    });
});

describe('formatDashboardData', () => {
    it('should format dashboard data as readable string', () => {
        const data: WranglerDashboardData = {
            workers: [{ name: 'worker1', routes: ['example.com/*'] }, { name: 'worker2' }],
            r2Buckets: [{ name: 'bucket1', location: 'us-east-1' }],
            kvNamespaces: [{ id: 'abc123', title: 'namespace1' }],
            durableObjects: [],
            deployments: [],
            analytics: {
                requests: { success: 100, error: 5, total: 105 },
                bandwidth: { bytes: 1024000 },
                cpu_time: {
                    percentiles: { p50: 10, p75: 20, p99: 100 },
                },
            },
        };

        const result = formatDashboardData(data);
        expect(result).toContain('📦 Workers:');
        expect(result).toContain('worker1 (example.com/*)');
        expect(result).toContain('🪣 R2 Buckets:');
        expect(result).toContain('bucket1 (us-east-1)');
        expect(result).toContain('🗄️ KV Namespaces:');
        expect(result).toContain('namespace1 (abc123)');
        expect(result).toContain('📊 Analytics:');
        expect(result).toContain('105 (100 success, 5 error)');
    });

    it('should handle empty data', () => {
        const data: WranglerDashboardData = {
            workers: [],
            r2Buckets: [],
            kvNamespaces: [],
            durableObjects: [],
            deployments: [],
        };

        const result = formatDashboardData(data);
        expect(result).toBe('');
    });
});
