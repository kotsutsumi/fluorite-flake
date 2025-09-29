/**
 * GitHubサービスアダプター
 *
 * GitHub CLI (gh)と統合してダッシュボードデータと管理機能を提供します。
 * 全ての操作に公式GitHub CLIを使用します。
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
} from '../base-service-adapter.js';

const execAsync = promisify(exec);

export class GitHubAdapter extends BaseServiceAdapter {
    readonly name = 'github';
    readonly displayName = 'GitHub';
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
        userManagement: true,
    };

    private organization?: string;
    private repository?: string;

    constructor(config?: ServiceConfig) {
        super(config);
        this.organization = config?.organization as string;
        this.repository = config?.repository as string;
    }

    async initialize(config?: ServiceConfig): Promise<void> {
        this.config = { ...this.config, ...config };
        if (config?.organization) {
            this.organization = config.organization as string;
        }
        if (config?.repository) {
            this.repository = config.repository as string;
        }

        // GitHub CLIがインストールされているかどうかをチェック
        try {
            await execAsync('gh --version');
            this.updateStatus({ connected: true });
        } catch (_error) {
            throw new Error(
                'GitHub CLIがインストールされていません。まずインストールしてください: https://cli.github.com/'
            );
        }
    }

    async authenticate(authConfig: AuthConfig): Promise<boolean> {
        try {
            // 既に認証されているかどうかをチェック
            const { stdout } = await execAsync('gh auth status');
            if (stdout.includes('Logged in')) {
                this.authConfig = authConfig;
                this.updateStatus({ authenticated: true });
                return true;
            }

            // トークンでログインを試す
            if (authConfig.token) {
                await execAsync(`echo ${authConfig.token} | gh auth login --with-token`);
                this.authConfig = authConfig;
                this.updateStatus({ authenticated: true });
                return true;
            }

            return false;
        } catch (error) {
            // エラーメッセージがログインしていることを示しているかどうかをチェック
            const errorMsg = (error as any).stderr || (error as Error).message;
            if (errorMsg.includes('Logged in')) {
                this.authConfig = authConfig;
                this.updateStatus({ authenticated: true });
                return true;
            }

            this.updateStatus({ authenticated: false, error: errorMsg });
            return false;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        try {
            await execAsync('gh auth status');
            return true;
        } catch (error) {
            // gh auth statusはログインしている場合でも非ゼロの終了コードを返す
            const errorMsg = (error as any).stderr || '';
            return errorMsg.includes('Logged in');
        }
    }

    async connect(): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated. Please authenticate first with: gh auth login');
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
            await execAsync('gh --version');
            checks.push({
                name: 'CLI Available',
                status: 'pass' as const,
                message: 'GitHub CLI is available',
                duration: Date.now() - startTime,
            });
        } catch {
            checks.push({
                name: 'CLI Available',
                status: 'fail' as const,
                message: 'GitHub CLI is not available',
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

        // APIアクセスをチェック
        if (isAuth) {
            try {
                await execAsync('gh api user');
                checks.push({
                    name: 'API Access',
                    status: 'pass' as const,
                    message: 'GitHub API accessible',
                    duration: Date.now() - startTime,
                });
            } catch {
                checks.push({
                    name: 'API Access',
                    status: 'fail' as const,
                    message: 'Cannot access GitHub API',
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
            // リポジトリを取得
            // const _repoQuery = this.organization
            //   ? `org:${this.organization}`
            //   : 'user:@me';

            const { stdout: reposOut } = await execAsync(
                `gh repo list ${this.organization || ''} --json name,stargazerCount,forkCount,openIssuesCount,pushedAt --limit 30`
            );
            const repos = JSON.parse(reposOut || '[]');

            data.repositories = repos.map((repo: any) => ({
                name: repo.name,
                stars: repo.stargazerCount,
                forks: repo.forkCount,
                openIssues: repo.openIssuesCount,
                lastPush: repo.pushedAt,
            }));

            // プルリクエストを取得
            if (this.repository || repos.length > 0) {
                const targetRepo = this.repository || repos[0]?.name;
                try {
                    const { stdout: prsOut } = await execAsync(
                        `gh pr list ${this.organization ? `--repo ${this.organization}/${targetRepo}` : ''} --json title,author,state,reviewDecision,createdAt --limit 20`
                    );
                    const prs = JSON.parse(prsOut || '[]');

                    data.pullRequests = prs.map((pr: any) => ({
                        title: pr.title,
                        author: pr.author?.login || 'unknown',
                        status: pr.state,
                        reviewCount: pr.reviewDecision ? 1 : 0,
                        createdAt: pr.createdAt,
                    }));
                } catch {
                    data.pullRequests = [];
                }
            }

            // イシューを取得
            if (this.repository || repos.length > 0) {
                const targetRepo = this.repository || repos[0]?.name;
                try {
                    const { stdout: issuesOut } = await execAsync(
                        `gh issue list ${this.organization ? `--repo ${this.organization}/${targetRepo}` : ''} --json title,labels,assignees,createdAt --limit 20`
                    );
                    const issues = JSON.parse(issuesOut || '[]');

                    data.issues = issues.map((issue: any) => ({
                        title: issue.title,
                        labels: issue.labels?.map((l: any) => l.name) || [],
                        assignee: issue.assignees?.[0]?.login || 'unassigned',
                        createdAt: issue.createdAt,
                    }));
                } catch {
                    data.issues = [];
                }
            }

            // ワークフロー実行を取得（GitHub Actions）
            if (this.repository || repos.length > 0) {
                const targetRepo = this.repository || repos[0]?.name;
                try {
                    const { stdout: runsOut } = await execAsync(
                        `gh run list ${this.organization ? `--repo ${this.organization}/${targetRepo}` : ''} --json name,status,conclusion,createdAt --limit 10`
                    );
                    const runs = JSON.parse(runsOut || '[]');

                    data.actions = runs.map((run: any) => ({
                        name: run.name,
                        status: run.conclusion || run.status,
                        duration: 0, // 持続時間はgh cliから直接取得できない
                        createdAt: run.createdAt,
                    }));
                } catch {
                    data.actions = [];
                }
            }

            // アクティビティデータのモック（GitHub CLIはアクティビティメトリクスを直接提供しない）
            const days = 7;
            data.activity = {
                commits: Array(days)
                    .fill(0)
                    .map(() => Math.floor(Math.random() * 50)),
                pullRequests: Array(days)
                    .fill(0)
                    .map(() => Math.floor(Math.random() * 10)),
                issues: Array(days)
                    .fill(0)
                    .map(() => Math.floor(Math.random() * 15)),
            };

            // 貢献者データのモック
            data.contributors = [
                { name: 'contributor1', contributions: Math.floor(Math.random() * 100) + 50 },
                { name: 'contributor2', contributions: Math.floor(Math.random() * 80) + 30 },
                { name: 'contributor3', contributions: Math.floor(Math.random() * 60) + 20 },
                { name: 'contributor4', contributions: Math.floor(Math.random() * 40) + 10 },
                { name: 'others', contributions: Math.floor(Math.random() * 30) + 5 },
            ];
        } catch (error) {
            this.emitError((error as Error).message);
        }

        return data;
    }

    async getMetrics(_options?: MetricsOptions): Promise<ServiceMetrics> {
        // メトリクスのモック - GitHub APIはこれらのメトリクスを直接提供しない
        return {
            timestamp: Date.now(),
            performance: {
                avgResponseTime: Math.random() * 500,
                throughput: Math.random() * 1000,
                errorRate: Math.random() * 2,
                activeConnections: Math.floor(Math.random() * 100),
            },
            usage: {
                requests: Math.floor(Math.random() * 100000),
                dataTransfer: Math.floor(Math.random() * 1000000000),
                resourceUtilization: Math.random() * 100,
                cost: 0, // GitHubはパブリックリポジトリでは通常無料
            },
            errors: {
                totalErrors: Math.floor(Math.random() * 10),
                errorsByType: {
                    rate_limit: Math.floor(Math.random() * 5),
                    auth: Math.floor(Math.random() * 2),
                    not_found: Math.floor(Math.random() * 3),
                },
                recentErrors: [],
            },
        };
    }

    async *getLogs(_options?: LogOptions): AsyncIterable<LogEntry> {
        // リポジトリが指定されている場合はワークフローログをストリーム
        if (this.repository) {
            const repoArg = this.organization
                ? `--repo ${this.organization}/${this.repository}`
                : `--repo ${this.repository}`;

            // 最新の実行を取得
            try {
                const { stdout } = await execAsync(
                    `gh run list ${repoArg} --json databaseId --limit 1`
                );
                const runs = JSON.parse(stdout || '[]');

                if (runs.length > 0) {
                    const runId = runs[0].databaseId;

                    // 実行からログをストリーム
                    const logProcess = spawn('gh', [
                        'run',
                        'view',
                        runId.toString(),
                        repoArg,
                        '--log',
                    ]);

                    for await (const chunk of logProcess.stdout) {
                        const lines = chunk.toString().split('\n').filter(Boolean);
                        for (const line of lines) {
                            yield {
                                id: Date.now().toString(),
                                timestamp: Date.now(),
                                level: 'info' as LogLevel,
                                message: line,
                                source: 'github-actions',
                                metadata: { repository: this.repository, runId },
                            };
                        }
                    }
                }
            } catch {
                // 実行がないかエラーの場合、モックログを返す
                while (true) {
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    yield {
                        id: Date.now().toString(),
                        timestamp: Date.now(),
                        level: 'info' as LogLevel,
                        message: 'No active workflow runs',
                        source: 'github',
                        metadata: {},
                    };
                }
            }
        } else {
            // 一般的なアクティビティログを返す
            while (true) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                yield {
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    level: 'info' as LogLevel,
                    message: `GitHub activity check at ${new Date().toISOString()}`,
                    source: 'github',
                    metadata: {},
                };
            }
        }
    }

    async listResources(type?: string): Promise<Resource[]> {
        const resources: Resource[] = [];

        if (!type || type === 'repository') {
            try {
                const { stdout } = await execAsync(
                    `gh repo list ${this.organization || ''} --json name,description,isPrivate,pushedAt,url --limit 100`
                );
                const repos = JSON.parse(stdout || '[]');

                for (const repo of repos) {
                    resources.push({
                        id: repo.name,
                        type: 'repository',
                        name: repo.name,
                        status: 'active' as ResourceStatus,
                        createdAt: new Date(repo.pushedAt).getTime(),
                        updatedAt: new Date(repo.pushedAt).getTime(),
                        metadata: repo,
                        availableActions: ['view', 'clone', 'archive', 'delete'],
                    });
                }
            } catch (error) {
                this.emitError((error as Error).message);
            }
        }

        if (!type || type === 'workflow') {
            if (this.repository) {
                try {
                    const repoArg = this.organization
                        ? `--repo ${this.organization}/${this.repository}`
                        : `--repo ${this.repository}`;

                    const { stdout } = await execAsync(
                        `gh workflow list ${repoArg} --json name,id,state`
                    );
                    const workflows = JSON.parse(stdout || '[]');

                    for (const workflow of workflows) {
                        resources.push({
                            id: workflow.id.toString(),
                            type: 'workflow',
                            name: workflow.name,
                            status:
                                workflow.state === 'active'
                                    ? 'active'
                                    : ('inactive' as ResourceStatus),
                            createdAt: Date.now() - 86400000, // モック
                            updatedAt: Date.now(),
                            metadata: workflow,
                            availableActions: ['view', 'run', 'disable', 'enable'],
                        });
                    }
                } catch (error) {
                    this.emitError((error as Error).message);
                }
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
                case 'create-issue': {
                    const { title, body, repo } = action.params as {
                        title: string;
                        body?: string;
                        repo?: string;
                    };
                    const repoArg =
                        repo || this.repository
                            ? `--repo ${repo || `${this.organization}/${this.repository}`}`
                            : '';

                    const { stdout } = await execAsync(
                        `gh issue create --title "${title}" ${body ? `--body "${body}"` : ''} ${repoArg}`
                    );
                    return {
                        success: true,
                        message: 'Issue created successfully',
                        data: { url: stdout.trim() },
                    };
                }

                case 'create-pr': {
                    const { title, body, base, head } = action.params as {
                        title: string;
                        body?: string;
                        base?: string;
                        head?: string;
                    };

                    const { stdout } = await execAsync(
                        `gh pr create --title "${title}" ${body ? `--body "${body}"` : ''} ${base ? `--base ${base}` : ''} ${head ? `--head ${head}` : ''}`
                    );
                    return {
                        success: true,
                        message: 'Pull request created successfully',
                        data: { url: stdout.trim() },
                    };
                }

                case 'merge-pr': {
                    const { number, method } = action.params as { number: number; method?: string };
                    const mergeMethod = method || 'merge';

                    await execAsync(`gh pr merge ${number} --${mergeMethod}`);
                    return {
                        success: true,
                        message: `Pull request #${number} merged successfully`,
                    };
                }

                case 'close-issue': {
                    const { number } = action.params as { number: number };
                    await execAsync(`gh issue close ${number}`);
                    return {
                        success: true,
                        message: `Issue #${number} closed successfully`,
                    };
                }

                case 'run-workflow': {
                    const { workflow, ref } = action.params as { workflow: string; ref?: string };
                    const refArg = ref ? `--ref ${ref}` : '';

                    await execAsync(`gh workflow run ${workflow} ${refArg}`);
                    return {
                        success: true,
                        message: `Workflow ${workflow} triggered successfully`,
                    };
                }

                case 'create-release': {
                    const { tag, title, notes } = action.params as {
                        tag: string;
                        title?: string;
                        notes?: string;
                    };

                    const { stdout } = await execAsync(
                        `gh release create ${tag} ${title ? `--title "${title}"` : ''} ${notes ? `--notes "${notes}"` : ''}`
                    );
                    return {
                        success: true,
                        message: 'Release created successfully',
                        data: { url: stdout.trim() },
                    };
                }

                case 'fork-repo': {
                    const { repo } = action.params as { repo: string };
                    const { stdout } = await execAsync(`gh repo fork ${repo} --clone=false`);
                    return {
                        success: true,
                        message: 'Repository forked successfully',
                        data: { url: stdout.trim() },
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

export default GitHubAdapter;
