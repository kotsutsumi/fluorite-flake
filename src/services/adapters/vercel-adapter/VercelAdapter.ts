/**
 * Vercelサービスアダプター実装
 *
 * Vercelデプロイメントプラットフォーム用のダッシュボード操作を実装します。
 * プロジェクト、デプロイメント、ドメイン、アナリティクス、関数へのアクセスを提供します。
 */

import { execSync } from 'node:child_process';
import { BaseServiceAdapter } from '../../base-service-adapter/index.js';
import type {
    ActionResult,
    AuthConfig,
    DashboardDataOptions,
    ErrorMetrics,
    HealthStatus,
    LogEntry,
    LogOptions,
    MetricsOptions,
    PerformanceMetrics,
    Resource,
    ResourceStatus,
    ServiceAction,
    ServiceCapabilities,
    ServiceConfig,
    ServiceDashboardData,
    ServiceMetrics,
    UsageMetrics,
} from '../../base-service-adapter/index.js';
import type {
    VercelProject,
    VercelDeployment,
    VercelDomain,
    VercelAnalytics,
    VercelConfig,
} from './types.js';

/**
 * Vercelサービスアダプター実装
 */
export class VercelAdapter extends BaseServiceAdapter {
    readonly name = 'vercel';
    readonly displayName = 'Vercel';
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
        database: false,
        userManagement: false,
    };

    private vercelConfig: VercelConfig = {};
    private cliAvailable = false;

    constructor(config?: VercelConfig) {
        super(config);
        this.vercelConfig = { ...config };
    }

    async initialize(config?: ServiceConfig): Promise<void> {
        if (config) {
            this.vercelConfig = { ...this.vercelConfig, ...config };
        }

        // Vercel CLIが利用可能かどうかをチェック
        try {
            execSync('vercel --version', { stdio: 'ignore' });
            this.cliAvailable = true;
        } catch {
            throw new Error('Vercel CLI is not installed. Install with: npm install -g vercel');
        }

        this.updateStatus({ connected: false, authenticated: false });
    }

    async authenticate(authConfig: AuthConfig): Promise<boolean> {
        this.authConfig = authConfig;

        try {
            // CLI用のトークン環境変数を設定
            process.env.VERCEL_TOKEN = authConfig.token;

            // ユーザー情報を取得して認証をテスト
            const result = execSync('vercel whoami --scope team', {
                encoding: 'utf-8',
                timeout: this.vercelConfig.timeout || 30000,
            });

            if (result.trim()) {
                this.updateStatus({ authenticated: true });
                return true;
            }

            return false;
        } catch (error) {
            this.emitError(`Authentication failed: ${error}`);
            return false;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        try {
            execSync('vercel whoami', { stdio: 'ignore', timeout: 5000 });
            return true;
        } catch {
            return false;
        }
    }

    async connect(): Promise<void> {
        if (!this.cliAvailable) {
            throw new Error('Vercel CLI not available');
        }

        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Vercel');
        }

        this.updateStatus({ connected: true });
    }

    async disconnect(): Promise<void> {
        this.updateStatus({ connected: false });
    }

    async healthCheck(): Promise<HealthStatus> {
        const start = Date.now();
        const checks: Array<{
            name: string;
            status: 'pass' | 'fail' | 'warn';
            message: string;
            duration: number;
        }> = [];

        // CLIの利用可能性をチェック
        try {
            execSync('vercel --version', { stdio: 'ignore', timeout: 5000 });
            checks.push({
                name: 'CLI Available',
                status: 'pass',
                message: 'Vercel CLI is installed and accessible',
                duration: Date.now() - start,
            });
        } catch {
            checks.push({
                name: 'CLI Available',
                status: 'fail',
                message: 'Vercel CLI not found',
                duration: Date.now() - start,
            });
        }

        // 認証をチェック
        const authStart = Date.now();
        try {
            execSync('vercel whoami', { stdio: 'ignore', timeout: 5000 });
            checks.push({
                name: 'Authentication',
                status: 'pass',
                message: 'Successfully authenticated',
                duration: Date.now() - authStart,
            });
        } catch {
            checks.push({
                name: 'Authentication',
                status: 'fail',
                message: 'Authentication failed',
                duration: Date.now() - authStart,
            });
        }

        // API接続をチェック
        const apiStart = Date.now();
        try {
            execSync('vercel ls --count 1', { stdio: 'ignore', timeout: 10000 });
            checks.push({
                name: 'API Connectivity',
                status: 'pass',
                message: 'API is reachable',
                duration: Date.now() - apiStart,
            });
        } catch {
            checks.push({
                name: 'API Connectivity',
                status: 'fail',
                message: 'Cannot reach Vercel API',
                duration: Date.now() - apiStart,
            });
        }

        const overallStatus = checks.every((c) => c.status === 'pass')
            ? 'healthy'
            : checks.some((c) => c.status === 'fail')
              ? 'unhealthy'
              : 'degraded';

        return {
            status: overallStatus,
            timestamp: Date.now(),
            responseTime: Date.now() - start,
            checks,
        };
    }

    async getDashboardData(options?: DashboardDataOptions): Promise<ServiceDashboardData> {
        try {
            const [projects, deployments, domains] = await Promise.all([
                this.getProjects(),
                this.getDeployments(),
                this.getDomains(),
            ]);

            const data: ServiceDashboardData = {
                timestamp: Date.now(),
                projects,
                deployments,
                domains,
                summary: {
                    totalProjects: projects.length,
                    totalDeployments: deployments.length,
                    totalDomains: domains.length,
                    activeDeployments: deployments.filter((d) => d.state === 'READY').length,
                },
            };

            // リクエストされた場合はアナリティクスを追加
            if (!options?.sections || options.sections.includes('analytics')) {
                try {
                    data.analytics = await this.getAnalytics();
                } catch (_error) {
                    // アナリティクスは全てのアカウントで利用できない場合がある
                    data.analytics = null;
                }
            }

            this.emitDashboardUpdate(data);
            return data;
        } catch (error) {
            throw new Error(`Failed to get dashboard data: ${error}`);
        }
    }

    async getMetrics(_options?: MetricsOptions): Promise<ServiceMetrics> {
        try {
            // デプロイメントメトリクスを取得
            const deployments = await this.getDeployments();
            const recentDeployments = deployments.filter(
                (d) => d.createdAt > Date.now() - 24 * 60 * 60 * 1000 // 過去24時間
            );

            const successfulDeployments = recentDeployments.filter((d) => d.state === 'READY');
            const failedDeployments = recentDeployments.filter((d) => d.state === 'ERROR');

            // 平均ビルド時間を計算
            const buildTimes = deployments
                .filter((d) => d.buildingAt && d.ready)
                .map((d) => d.ready - (d.buildingAt || 0));
            const avgBuildTime =
                buildTimes.length > 0
                    ? buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length
                    : 0;

            const performance: PerformanceMetrics = {
                avgResponseTime: avgBuildTime,
                throughput: recentDeployments.length,
                errorRate:
                    recentDeployments.length > 0
                        ? (failedDeployments.length / recentDeployments.length) * 100
                        : 0,
                activeConnections: deployments.filter((d) => d.state === 'READY').length,
            };

            const usage: UsageMetrics = {
                requests: recentDeployments.length,
                dataTransfer: 0, // Would need to fetch from analytics API
                resourceUtilization:
                    (successfulDeployments.length / Math.max(recentDeployments.length, 1)) * 100,
            };

            const errors: ErrorMetrics = {
                totalErrors: failedDeployments.length,
                errorsByType: {
                    deployment: failedDeployments.length,
                },
                recentErrors: failedDeployments.slice(0, 5).map((d) => ({
                    type: 'deployment',
                    count: 1,
                    lastOccurrence: d.createdAt,
                    message: `Deployment ${d.name} failed`,
                })),
            };

            const metrics: ServiceMetrics = {
                timestamp: Date.now(),
                performance,
                usage,
                errors,
            };

            this.emitMetricsUpdate(metrics);
            return metrics;
        } catch (error) {
            throw new Error(`Failed to get metrics: ${error}`);
        }
    }

    async *getLogs(options?: LogOptions): AsyncIterable<LogEntry> {
        if (!options?.follow) {
            // 最近のログを返す
            try {
                const deployments = await this.getDeployments();
                for (const deployment of deployments.slice(0, 10)) {
                    yield {
                        id: `deploy-${deployment.uid}`,
                        timestamp: deployment.createdAt,
                        level: deployment.state === 'ERROR' ? 'error' : 'info',
                        message: `Deployment ${deployment.name} ${deployment.state.toLowerCase()}`,
                        source: 'vercel-deployments',
                        metadata: {
                            deploymentId: deployment.uid,
                            url: deployment.url,
                            state: deployment.state,
                        },
                    };
                }
            } catch (error) {
                yield {
                    id: `error-${Date.now()}`,
                    timestamp: Date.now(),
                    level: 'error',
                    message: `Failed to fetch logs: ${error}`,
                    source: 'vercel-adapter',
                };
            }
        } else {
            // ライブログをストリーム（簡単化された実装）
            yield* this.streamLiveLogs(options);
        }
    }

    async listResources(type?: string): Promise<Resource[]> {
        const resources: Resource[] = [];

        try {
            if (!type || type === 'project') {
                const projects = await this.getProjects();
                resources.push(
                    ...projects.map((p) => ({
                        id: p.id,
                        type: 'project',
                        name: p.name,
                        status: 'active' as const,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        metadata: {
                            framework: p.framework,
                            link: p.link,
                        },
                        availableActions: ['deploy', 'delete', 'configure'],
                    }))
                );
            }

            if (!type || type === 'deployment') {
                const deployments = await this.getDeployments();
                resources.push(
                    ...deployments.map((d) => ({
                        id: d.uid,
                        type: 'deployment',
                        name: d.name,
                        status: d.state.toLowerCase() as
                            | 'active'
                            | 'inactive'
                            | 'error'
                            | 'pending',
                        createdAt: d.createdAt,
                        updatedAt: d.ready || d.createdAt,
                        metadata: {
                            url: d.url,
                            state: d.state,
                            creator: d.creator,
                        },
                        availableActions:
                            d.state === 'READY' ? ['promote', 'delete', 'inspect'] : ['cancel'],
                    }))
                );
            }

            if (!type || type === 'domain') {
                const domains = await this.getDomains();
                resources.push(
                    ...domains.map((d) => ({
                        id: d.name,
                        type: 'domain',
                        name: d.name,
                        status: (d.verified ? 'active' : 'pending') as ResourceStatus,
                        createdAt: d.createdAt,
                        updatedAt: d.createdAt,
                        metadata: {
                            verified: d.verified,
                            nameservers: d.nameservers,
                            intendedNameservers: d.intendedNameservers,
                        },
                        availableActions: ['verify', 'delete', 'configure'],
                    }))
                );
            }
        } catch (error) {
            throw new Error(`Failed to list resources: ${error}`);
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
                case 'deploy':
                    return await this.deployProject(action.resourceId || '', action.params);

                case 'delete':
                    return await this.deleteResource(
                        action.resourceId || '',
                        action.params?.resourceType as string
                    );

                case 'promote':
                    return await this.promoteDeployment(action.resourceId || '');

                default:
                    return {
                        success: false,
                        message: `Unsupported action: ${action.type}`,
                        error: {
                            code: 'UNSUPPORTED_ACTION',
                            details: `Action ${action.type} is not implemented`,
                        },
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `Action failed: ${error}`,
                error: {
                    code: 'ACTION_FAILED',
                    details: String(error),
                },
            };
        }
    }

    // プライベートヘルパーメソッド

    private async getProjects(): Promise<VercelProject[]> {
        try {
            const cmd = this.vercelConfig.team
                ? `vercel ls --scope ${this.vercelConfig.team}`
                : 'vercel ls';

            const result = execSync(`${cmd} --json`, {
                encoding: 'utf-8',
                timeout: this.vercelConfig.timeout || 30000,
            });

            return JSON.parse(result) || [];
        } catch (error) {
            throw new Error(`Failed to fetch projects: ${error}`);
        }
    }

    private async getDeployments(): Promise<VercelDeployment[]> {
        try {
            const cmd = this.vercelConfig.team
                ? `vercel ls --scope ${this.vercelConfig.team}`
                : 'vercel ls';

            const result = execSync(`${cmd} --json`, {
                encoding: 'utf-8',
                timeout: this.vercelConfig.timeout || 30000,
            });

            // 注意: これは簡化されたもの - 実際のVercel CLIは異なる構造を持つ場合がある
            const projects = JSON.parse(result) || [];
            const deployments: VercelDeployment[] = [];

            // 各プロジェクトのデプロイメントを取得（簡化）
            for (const project of projects.slice(0, 5)) {
                // Limit to prevent timeout
                try {
                    const deployResult = execSync(`vercel ls ${project.name} --json`, {
                        encoding: 'utf-8',
                        timeout: 10000,
                    });
                    const projectDeployments = JSON.parse(deployResult) || [];
                    deployments.push(...projectDeployments);
                } catch {
                    // プロジェクトのデプロイメントを取得できない場合はスキップ
                }
            }

            return deployments;
        } catch (error) {
            throw new Error(`Failed to fetch deployments: ${error}`);
        }
    }

    private async getDomains(): Promise<VercelDomain[]> {
        try {
            const cmd = this.vercelConfig.team
                ? `vercel domains ls --scope ${this.vercelConfig.team}`
                : 'vercel domains ls';

            const result = execSync(`${cmd} --json`, {
                encoding: 'utf-8',
                timeout: this.vercelConfig.timeout || 30000,
            });

            return JSON.parse(result) || [];
        } catch (_error) {
            // ドメインコマンドは利用できないか、失敗する可能性がある
            return [];
        }
    }

    private async getAnalytics(): Promise<VercelAnalytics | null> {
        // 注意: Analytics APIは特定のエンドポイントが必要で、CLI経由では利用できない可能性がある
        // 通常、適切な認証で直接API呼び出しが必要
        return null;
    }

    private async *streamLiveLogs(_options?: LogOptions): AsyncIterable<LogEntry> {
        // 簡略化されたライブログストリーミング - 実際にはVercelのログストリーミングAPIを使用
        const interval = setInterval(async () => {
            try {
                const deployments = await this.getDeployments();
                const activeDeployments = deployments.filter(
                    (d) =>
                        d.state === 'BUILDING' || d.state === 'INITIALIZING' || d.state === 'QUEUED'
                );

                for (const deployment of activeDeployments) {
                    const entry: LogEntry = {
                        id: `live-${deployment.uid}-${Date.now()}`,
                        timestamp: Date.now(),
                        level: 'info',
                        message: `Deployment ${deployment.name} is ${deployment.state.toLowerCase()}`,
                        source: 'vercel-live',
                        metadata: {
                            deploymentId: deployment.uid,
                            state: deployment.state,
                        },
                    };

                    this.emitLogEntry(entry);
                }
            } catch (_error) {
                // ライブストリームのエラー処理
            }
        }, 5000); // Poll every 5 seconds

        // 一定時間後または切断時にクリーンアップ
        setTimeout(() => clearInterval(interval), 60000); // Stop after 1 minute
    }

    private async deployProject(
        _projectId: string,
        _params?: Record<string, unknown>
    ): Promise<ActionResult> {
        try {
            const cmd = this.vercelConfig.team
                ? `vercel --scope ${this.vercelConfig.team}`
                : 'vercel';

            // これは簡略化されたもの - 実際のデプロイメントはより複雑
            const result = execSync(cmd, {
                encoding: 'utf-8',
                timeout: 120000, // 2 minutes for deployment
            });

            return {
                success: true,
                message: 'Deployment started successfully',
                data: { output: result },
            };
        } catch (error) {
            return {
                success: false,
                message: `Deployment failed: ${error}`,
                error: {
                    code: 'DEPLOYMENT_FAILED',
                    details: String(error),
                },
            };
        }
    }

    private async deleteResource(resourceId: string, resourceType: string): Promise<ActionResult> {
        try {
            let cmd: string;

            switch (resourceType) {
                case 'project':
                    cmd = `vercel rm ${resourceId} --yes`;
                    break;
                case 'domain':
                    cmd = `vercel domains rm ${resourceId} --yes`;
                    break;
                default:
                    throw new Error(`Cannot delete resource type: ${resourceType}`);
            }

            if (this.vercelConfig.team) {
                cmd += ` --scope ${this.vercelConfig.team}`;
            }

            execSync(cmd, {
                encoding: 'utf-8',
                timeout: this.vercelConfig.timeout || 30000,
            });

            return {
                success: true,
                message: `${resourceType} ${resourceId} deleted successfully`,
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to delete ${resourceType}: ${error}`,
                error: {
                    code: 'DELETE_FAILED',
                    details: String(error),
                },
            };
        }
    }

    private async promoteDeployment(deploymentId: string): Promise<ActionResult> {
        try {
            const cmd = this.vercelConfig.team
                ? `vercel promote ${deploymentId} --scope ${this.vercelConfig.team}`
                : `vercel promote ${deploymentId}`;

            const result = execSync(cmd, {
                encoding: 'utf-8',
                timeout: this.vercelConfig.timeout || 30000,
            });

            return {
                success: true,
                message: 'Deployment promoted successfully',
                data: { output: result },
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to promote deployment: ${error}`,
                error: {
                    code: 'PROMOTE_FAILED',
                    details: String(error),
                },
            };
        }
    }
}

export default VercelAdapter;
