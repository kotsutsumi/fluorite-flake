/**
 * Tursoサービスアダプター
 *
 * Turso CLIと統合してダッシュボードデータと管理機能を提供します。
 * 全ての操作に公式Turso CLIを使用します。
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
    type ActionResult,
    type AuthConfig,
    BaseServiceAdapter,
    type DashboardDataOptions,
    type HealthStatus,
    type LogEntry,
    type LogLevel,
    type LogOptions,
    type MetricsOptions,
    type Resource,
    type ResourceStatus,
    type ServiceAction,
    type ServiceCapabilities,
    type ServiceConfig,
    type ServiceDashboardData,
    type ServiceMetrics,
} from '../../base-service-adapter/index.js';

const execAsync = promisify(exec);

export class TursoAdapter extends BaseServiceAdapter {
    readonly name = 'turso';
    readonly displayName = 'Turso';
    readonly version = '1.0.0';
    readonly capabilities: ServiceCapabilities = {
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
    };

    // private _organizationName?: string;

    async initialize(config?: ServiceConfig): Promise<void> {
        this.config = { ...this.config, ...config };
        // this._organizationName = config?.organization as string;

        // Turso CLIがインストールされているかどうかをチェック
        try {
            await execAsync('turso --version');
            this.updateStatus({ connected: true });
        } catch (_error) {
            throw new Error(
                'Turso CLIがインストールされていません。まずインストールしてください: curl -sSfL https://get.tur.so/install.sh | bash'
            );
        }
    }

    async authenticate(authConfig: AuthConfig): Promise<boolean> {
        try {
            // Tursoはトークンベースの認証を使用
            await execAsync(`turso auth token ${authConfig.token}`);

            this.authConfig = authConfig;
            this.updateStatus({ authenticated: true });
            return true;
        } catch (_error) {
            // トークンが機能しない場合はログインを試す
            try {
                await execAsync('turso auth login');
                this.authConfig = authConfig;
                this.updateStatus({ authenticated: true });
                return true;
            } catch (loginError) {
                this.updateStatus({ authenticated: false, error: (loginError as Error).message });
                return false;
            }
        }
    }

    async isAuthenticated(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('turso auth whoami');
            return stdout.includes('@') || stdout.includes('logged in');
        } catch {
            return false;
        }
    }

    async connect(): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated. Please authenticate first.');
        }

        this.updateStatus({ connected: true });
        this.emitDashboardUpdate(await this.getDashboardData());
    }

    async disconnect(): Promise<void> {
        this.updateStatus({ connected: false });
    }

    async healthCheck(): Promise<HealthStatus> {
        const startTime = Date.now();
        const checks = [];

        // CLIの利用可能性をチェック
        try {
            await execAsync('turso --version');
            checks.push({
                name: 'CLI Available',
                status: 'pass' as const,
                message: 'Turso CLI is available',
                duration: Date.now() - startTime,
            });
        } catch {
            checks.push({
                name: 'CLI Available',
                status: 'fail' as const,
                message: 'Turso CLI is not available',
                duration: Date.now() - startTime,
            });
        }

        // 認証をチェック
        const isAuth = await this.isAuthenticated();
        checks.push({
            name: 'Authentication',
            status: isAuth ? ('pass' as const) : ('fail' as const),
            message: isAuth ? 'Authenticated' : 'Not authenticated',
            duration: Date.now() - startTime,
        });

        // データベースアクセスをチェック
        if (isAuth) {
            try {
                await execAsync('turso db list');
                checks.push({
                    name: 'Database Access',
                    status: 'pass' as const,
                    message: 'Can access databases',
                    duration: Date.now() - startTime,
                });
            } catch {
                checks.push({
                    name: 'Database Access',
                    status: 'fail' as const,
                    message: 'Cannot access databases',
                    duration: Date.now() - startTime,
                });
            }
        }

        const allPassed = checks.every((c) => c.status === 'pass');

        return {
            status: allPassed
                ? 'healthy'
                : checks.some((c) => c.status === 'pass')
                  ? 'degraded'
                  : 'unhealthy',
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
            checks,
        };
    }

    async getDashboardData(_options?: DashboardDataOptions): Promise<ServiceDashboardData> {
        const data: ServiceDashboardData = {
            timestamp: Date.now(),
        };

        try {
            // データベースリストを取得
            const { stdout: dbListOut } = await execAsync('turso db list');

            // データベースリストをパース（フォーマット: NAME URL）
            const databases = dbListOut
                .split('\n')
                .filter((line) => line.trim() && !line.includes('NAME'))
                .map((line) => {
                    const parts = line.split(/\s+/);
                    const name = parts[0];
                    const url = parts[1];

                    // 利用可能な場合はURLからリージョンを抽出
                    const region = url?.includes('.')
                        ? url.split('.')[0].split('-').slice(-2).join('-')
                        : 'unknown';

                    return {
                        name,
                        url,
                        region,
                        size: Math.floor(Math.random() * 100000000), // Mock size
                        status: 'active',
                    };
                });

            data.databases = databases;

            // 最初のデータベースのレプリカを取得（ある場合）
            if (databases.length > 0) {
                try {
                    const { stdout: replicasOut } = await execAsync(
                        `turso db replicas list ${databases[0].name}`
                    );

                    const replicas = replicasOut
                        .split('\n')
                        .filter((line) => line.trim() && !line.includes('NAME'))
                        .map((line) => {
                            const parts = line.split(/\s+/);
                            return {
                                location: parts[0] || 'unknown',
                                status: 'active',
                                latency: Math.floor(Math.random() * 100),
                                syncStatus: 'synced',
                            };
                        });

                    data.replicas = replicas;
                } catch {
                    data.replicas = [];
                }
            }

            // クエリメトリクスのモック
            const hours = 24;
            data.queryMetrics = {
                reads: Array(hours)
                    .fill(0)
                    .map(() => Math.floor(Math.random() * 10000)),
                writes: Array(hours)
                    .fill(0)
                    .map(() => Math.floor(Math.random() * 5000)),
            };

            // 接続のモック
            data.connections = {
                active: Math.floor(Math.random() * 50),
                max: 100,
            };

            // ストレージのモック
            data.storage = {
                used: Math.floor(Math.random() * 5000000000),
                total: 10000000000,
            };

            // パフォーマンスメトリクスのモック
            data.performance = {
                readLatency: Math.random() * 10,
                writeLatency: Math.random() * 20,
                connectLatency: Math.random() * 5,
            };
        } catch (error) {
            this.emitError((error as Error).message);
        }

        return data;
    }

    async getMetrics(_options?: MetricsOptions): Promise<ServiceMetrics> {
        // メトリクスのモック - 実際の実装ではTursoメトリクスAPIから取得
        return {
            timestamp: Date.now(),
            performance: {
                avgResponseTime: Math.random() * 50,
                throughput: Math.random() * 10000,
                errorRate: Math.random() * 2,
                activeConnections: Math.floor(Math.random() * 100),
            },
            usage: {
                requests: Math.floor(Math.random() * 100000),
                dataTransfer: Math.floor(Math.random() * 1000000000),
                resourceUtilization: Math.random() * 100,
                cost: Math.random() * 50,
            },
            errors: {
                totalErrors: Math.floor(Math.random() * 50),
                errorsByType: {
                    connection: Math.floor(Math.random() * 20),
                    query: Math.floor(Math.random() * 15),
                    timeout: Math.floor(Math.random() * 10),
                },
                recentErrors: [],
            },
        };
    }

    async *getLogs(_options?: LogOptions): AsyncIterable<LogEntry> {
        // Tursoには組み込みのログストリーミングがないため、モックログを返す
        const messages = [
            'Database connection established',
            'Query executed successfully',
            'Replica synced',
            'Connection pool adjusted',
        ];

        while (true) {
            await new Promise((resolve) => setTimeout(resolve, 5000));

            yield {
                id: Date.now().toString(),
                timestamp: Date.now(),
                level: 'info' as LogLevel,
                message: messages[Math.floor(Math.random() * messages.length)],
                source: 'turso',
                metadata: {},
            };
        }
    }

    async listResources(type?: string): Promise<Resource[]> {
        const resources: Resource[] = [];

        if (!type || type === 'database') {
            try {
                const { stdout } = await execAsync('turso db list');

                const lines = stdout
                    .split('\n')
                    .filter((line) => line.trim() && !line.includes('NAME'));
                for (const line of lines) {
                    const parts = line.split(/\s+/);
                    const name = parts[0];
                    const url = parts[1];

                    if (name) {
                        resources.push({
                            id: name,
                            type: 'database',
                            name,
                            status: 'active' as ResourceStatus,
                            createdAt: Date.now() - 86400000, // Mock
                            updatedAt: Date.now(),
                            metadata: { url },
                            availableActions: ['view', 'shell', 'destroy', 'replicate'],
                        });
                    }
                }
            } catch (error) {
                this.emitError((error as Error).message);
            }
        }

        if (!type || type === 'location') {
            try {
                const { stdout } = await execAsync('turso db locations');

                const locations = stdout
                    .split('\n')
                    .filter((line) => line.trim())
                    .map((location) => ({
                        id: location.trim(),
                        type: 'location' as const,
                        name: location.trim(),
                        status: 'active' as ResourceStatus,
                        createdAt: Date.now() - 86400000,
                        updatedAt: Date.now(),
                        metadata: { location: location.trim() },
                        availableActions: ['view'],
                    }));

                resources.push(...locations);
            } catch (error) {
                this.emitError((error as Error).message);
            }
        }

        return resources;
    }

    async getResource(id: string, type: string): Promise<Resource | null> {
        const resources = await this.listResources(type);
        return resources.find((r) => r.id === id) || null;
    }

    async executeAction(action: ServiceAction): Promise<ActionResult> {
        try {
            switch (action.type) {
                case 'create-database': {
                    const { name, location } = action.params as { name: string; location?: string };
                    const cmd = location
                        ? `turso db create ${name} --location ${location}`
                        : `turso db create ${name}`;

                    await execAsync(cmd);
                    return {
                        success: true,
                        message: `Database ${name} created successfully`,
                    };
                }

                case 'destroy-database': {
                    const { name } = action.params as { name: string };
                    await execAsync(`turso db destroy ${name} --yes`);
                    return {
                        success: true,
                        message: `Database ${name} destroyed successfully`,
                    };
                }

                case 'create-replica': {
                    const { database, location } = action.params as {
                        database: string;
                        location: string;
                    };
                    await execAsync(`turso db replicate ${database} ${location}`);
                    return {
                        success: true,
                        message: `Replica created in ${location} for database ${database}`,
                    };
                }

                case 'shell': {
                    const { database } = action.params as { database: string };
                    // 対話型シェルを実行できないため、手順を返す
                    return {
                        success: true,
                        message: `To open shell, run: turso db shell ${database}`,
                        data: { command: `turso db shell ${database}` },
                    };
                }

                case 'show-url': {
                    const { database } = action.params as { database: string };
                    const { stdout } = await execAsync(`turso db show ${database} --url`);
                    return {
                        success: true,
                        message: 'Database URL retrieved',
                        data: { url: stdout.trim() },
                    };
                }

                case 'create-token': {
                    const { database, expiration } = action.params as {
                        database: string;
                        expiration?: string;
                    };
                    const cmd = expiration
                        ? `turso db tokens create ${database} --expiration ${expiration}`
                        : `turso db tokens create ${database}`;

                    const { stdout } = await execAsync(cmd);
                    return {
                        success: true,
                        message: 'Database token created',
                        data: { token: stdout.trim() },
                    };
                }

                default:
                    return {
                        success: false,
                        message: `Unknown action type: ${action.type}`,
                        error: {
                            code: 'UNKNOWN_ACTION',
                            details: `Action ${action.type} is not supported`,
                        },
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `Action failed: ${(error as Error).message}`,
                error: {
                    code: 'ACTION_FAILED',
                    details: (error as Error).message,
                },
            };
        }
    }
}

export default TursoAdapter;
