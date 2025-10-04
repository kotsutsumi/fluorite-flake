/**
 * Supabaseサービスアダプター
 *
 * Supabase CLIと統合してダッシュボードデータと管理機能を提供します。
 * 全ての操作に公式Supabase CLIを使用します。
 */

import { exec, spawn } from 'node:child_process';
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

export class SupabaseAdapter extends BaseServiceAdapter {
    readonly name = 'supabase';
    readonly displayName = 'Supabase';
    readonly version = '1.0.0';
    readonly capabilities: ServiceCapabilities = {
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
    };

    private projectId?: string;
    // private _apiUrl?: string;

    async initialize(config?: ServiceConfig): Promise<void> {
        this.config = { ...this.config, ...config };
        this.projectId = config?.projectId as string;
        // this._apiUrl = config?.apiUrl as string || 'https://api.supabase.com';

        // Supabase CLIがインストールされているかどうかをチェック
        try {
            await execAsync('supabase --version');
            this.updateStatus({ connected: true });
        } catch (_error) {
            throw new Error(
                'Supabase CLI is not installed. Please install it first: npm install -g supabase'
            );
        }
    }

    async authenticate(authConfig: AuthConfig): Promise<boolean> {
        try {
            // アクセストークンを設定
            await execAsync(`supabase login --token ${authConfig.token}`);

            this.authConfig = authConfig;
            this.updateStatus({ authenticated: true });
            return true;
        } catch (error) {
            this.updateStatus({ authenticated: false, error: (error as Error).message });
            return false;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('supabase projects list --output json');
            return stdout.includes('"id"');
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
            await execAsync('supabase --version');
            checks.push({
                name: 'CLI Available',
                status: 'pass' as const,
                message: 'Supabase CLI is available',
                duration: Date.now() - startTime,
            });
        } catch {
            checks.push({
                name: 'CLI Available',
                status: 'fail' as const,
                message: 'Supabase CLI is not available',
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

        // projectIdが設定されている場合はプロジェクトアクセスをチェック
        if (this.projectId) {
            try {
                await execAsync(`supabase projects api-keys --project-ref ${this.projectId}`);
                checks.push({
                    name: 'Project Access',
                    status: 'pass' as const,
                    message: 'Project accessible',
                    duration: Date.now() - startTime,
                });
            } catch {
                checks.push({
                    name: 'Project Access',
                    status: 'fail' as const,
                    message: 'Cannot access project',
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

        // プロジェクト情報を取得
        if (this.projectId) {
            try {
                // データベース情報を取得
                const { stdout: dbStatus } = await execAsync(
                    `supabase db remote list --project-ref ${this.projectId} --output json`
                );
                const databases = JSON.parse(dbStatus || '[]');

                data.database = {
                    usagePercent: Math.random() * 100, // Mock data - real implementation would fetch actual usage
                    databases,
                };

                // 認証ユーザーデータのモック（Supabase CLIは直接のユーザーリストを提供しない）
                data.authUsers = [
                    {
                        email: 'user1@example.com',
                        provider: 'email',
                        lastSignIn: Date.now() - 3600000,
                    },
                    {
                        email: 'user2@example.com',
                        provider: 'google',
                        lastSignIn: Date.now() - 7200000,
                    },
                    {
                        email: 'user3@example.com',
                        provider: 'github',
                        lastSignIn: Date.now() - 86400000,
                    },
                ];

                // Mock storage buckets
                data.storageBuckets = [
                    { name: 'avatars', fileCount: 156, size: 52428800 },
                    { name: 'documents', fileCount: 89, size: 104857600 },
                    { name: 'images', fileCount: 342, size: 209715200 },
                ];

                // Get functions list
                try {
                    const { stdout: functionsOut } = await execAsync(
                        `supabase functions list --project-ref ${this.projectId}`
                    );

                    // Parse functions output (format varies, this is simplified)
                    const functions = functionsOut
                        .split('\n')
                        .filter((line) => line.trim() && !line.includes('NAME'))
                        .map((line) => {
                            const parts = line.split(/\s+/);
                            return {
                                name: parts[0],
                                status: 'active',
                                invocations: Math.floor(Math.random() * 1000),
                                errors: Math.floor(Math.random() * 10),
                            };
                        });

                    data.functions = functions;
                } catch {
                    data.functions = [];
                }

                // Mock query metrics
                const hours = 24;
                data.queryMetrics = {
                    queries: Array(hours)
                        .fill(0)
                        .map(() => Math.floor(Math.random() * 1000)),
                    mutations: Array(hours)
                        .fill(0)
                        .map(() => Math.floor(Math.random() * 500)),
                };

                // Mock realtime connections
                data.realtime = {
                    total: 100,
                    active: Math.floor(Math.random() * 80) + 10,
                    idle: Math.floor(Math.random() * 10) + 5,
                };
            } catch (error) {
                this.emitError((error as Error).message);
            }
        } else {
            // Get projects list if no specific project
            try {
                const { stdout } = await execAsync('supabase projects list --output json');
                const projects = JSON.parse(stdout || '[]');
                data.projects = projects;
            } catch (_error) {
                data.projects = [];
            }
        }

        return data;
    }

    async getMetrics(_options?: MetricsOptions): Promise<ServiceMetrics> {
        // Mock metrics - real implementation would fetch from Supabase metrics API
        return {
            timestamp: Date.now(),
            performance: {
                avgResponseTime: Math.random() * 200,
                throughput: Math.random() * 1000,
                errorRate: Math.random() * 5,
                activeConnections: Math.floor(Math.random() * 100),
            },
            usage: {
                requests: Math.floor(Math.random() * 10000),
                dataTransfer: Math.floor(Math.random() * 1000000000),
                resourceUtilization: Math.random() * 100,
                cost: Math.random() * 100,
            },
            errors: {
                totalErrors: Math.floor(Math.random() * 100),
                errorsByType: {
                    '4xx': Math.floor(Math.random() * 50),
                    '5xx': Math.floor(Math.random() * 20),
                    timeout: Math.floor(Math.random() * 10),
                },
                recentErrors: [],
            },
        };
    }

    async *getLogs(_options?: LogOptions): AsyncIterable<LogEntry> {
        if (!this.projectId) {
            throw new Error('Project ID is required for logs');
        }

        // Use supabase functions logs command for streaming logs
        const logProcess = spawn('supabase', [
            'functions',
            'logs',
            '--project-ref',
            this.projectId,
        ]);

        for await (const chunk of logProcess.stdout) {
            const lines = chunk.toString().split('\n').filter(Boolean);
            for (const line of lines) {
                yield {
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    level: 'info' as LogLevel,
                    message: line,
                    source: 'supabase',
                    metadata: { projectId: this.projectId },
                };
            }
        }
    }

    async listResources(type?: string): Promise<Resource[]> {
        const resources: Resource[] = [];

        if (!type || type === 'project') {
            try {
                const { stdout } = await execAsync('supabase projects list --output json');
                const projects = JSON.parse(stdout || '[]');

                for (const project of projects) {
                    resources.push({
                        id: project.id,
                        type: 'project',
                        name: project.name,
                        status: 'active' as ResourceStatus,
                        createdAt: new Date(project.created_at).getTime(),
                        updatedAt: Date.now(),
                        metadata: project,
                        availableActions: ['view', 'pause', 'delete'],
                    });
                }
            } catch (error) {
                this.emitError((error as Error).message);
            }
        }

        if (this.projectId && (!type || type === 'function')) {
            try {
                const { stdout } = await execAsync(
                    `supabase functions list --project-ref ${this.projectId}`
                );

                const lines = stdout
                    .split('\n')
                    .filter((line) => line.trim() && !line.includes('NAME'));
                for (const line of lines) {
                    const parts = line.split(/\s+/);
                    if (parts[0]) {
                        resources.push({
                            id: parts[0],
                            type: 'function',
                            name: parts[0],
                            status: 'active' as ResourceStatus,
                            createdAt: Date.now() - 86400000, // Mock
                            updatedAt: Date.now(),
                            metadata: { name: parts[0] },
                            availableActions: ['view', 'invoke', 'delete', 'logs'],
                        });
                    }
                }
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
                case 'create-function': {
                    const { name } = action.params as { name: string };
                    await execAsync(
                        `supabase functions new ${name} --project-ref ${this.projectId}`
                    );
                    return {
                        success: true,
                        message: `Function ${name} created successfully`,
                    };
                }

                case 'deploy-function': {
                    const { name } = action.params as { name: string };
                    await execAsync(
                        `supabase functions deploy ${name} --project-ref ${this.projectId}`
                    );
                    return {
                        success: true,
                        message: `Function ${name} deployed successfully`,
                    };
                }

                case 'delete-function': {
                    const { name } = action.params as { name: string };
                    await execAsync(
                        `supabase functions delete ${name} --project-ref ${this.projectId}`
                    );
                    return {
                        success: true,
                        message: `Function ${name} deleted successfully`,
                    };
                }

                case 'db-push': {
                    await execAsync(`supabase db push --project-ref ${this.projectId}`);
                    return {
                        success: true,
                        message: 'Database changes pushed successfully',
                    };
                }

                case 'db-pull': {
                    await execAsync(`supabase db pull --project-ref ${this.projectId}`);
                    return {
                        success: true,
                        message: 'Database schema pulled successfully',
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

export default SupabaseAdapter;
