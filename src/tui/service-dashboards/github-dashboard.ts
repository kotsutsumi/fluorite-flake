/**
 * GitHub Service TUI Dashboard
 *
 * Terminal user interface specifically designed for GitHub repository monitoring.
 * Displays repositories, pull requests, issues, actions, and activity metrics.
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import {
    createTableWidget,
    createLineChartWidget,
    // createGaugeWidget,
    createLogWidget,
    // createBarChartWidget,
    createDonutWidget,
    updateTableData,
    updateChartData,
    // updateGaugeData,
    updateDonutData,
    addLogEntry,
    THEMES,
    // LAYOUTS
} from '../components/base-widget.js';
import type { DashboardOrchestrator } from '../../dashboard/dashboard-orchestrator.js';
import type { ServiceDashboardData } from '../../services/base-service-adapter/index.js';

// Widget interface definition
interface BlessedWidget {
    setData(data: unknown): void;
    setPercent?(percent: number): void;
    log?(message: string): void;
    focus?(): void;
    destroy?(): void;
}

// GitHub Dashboard data interfaces
interface GitHubRepository {
    name: string;
    stargazers_count: number;
    forks_count: number;
    language?: string;
    updated_at: string;
}

interface GitHubPullRequest {
    title: string;
    user?: { login: string };
    created_at: string;
    state: string;
}

interface GitHubIssue {
    title: string;
    user?: { login: string };
    created_at: string;
    state: string;
}

interface GitHubAction {
    name?: string;
    workflow_name?: string;
    status: string;
    created_at: string;
    actor?: { login: string };
}

interface GitHubContributor {
    login: string;
    contributions: number;
}

interface GitHubActivity {
    commits: number;
    pullRequests: number;
    issues: number;
}

export interface GitHubDashboardConfig {
    orchestrator: DashboardOrchestrator;
    theme?: 'dark' | 'light';
    refreshInterval?: number;
    organization?: string;
}

export class GitHubDashboard {
    private screen: blessed.Widgets.Screen;
    private grid: contrib.grid;
    private widgets: {
        repositories?: BlessedWidget;
        pullRequests?: BlessedWidget;
        issues?: BlessedWidget;
        actions?: BlessedWidget;
        activity?: BlessedWidget;
        contributors?: BlessedWidget;
        logs?: BlessedWidget;
        statusBar?: blessed.Widgets.BoxElement;
    } = {};
    private refreshTimer?: NodeJS.Timeout;
    private theme: (typeof THEMES)[keyof typeof THEMES] = THEMES.dark;
    private organization?: string;

    constructor(
        private orchestrator: DashboardOrchestrator,
        private config: GitHubDashboardConfig
    ) {
        // 画面を初期化
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'GitHub Dashboard',
            fullUnicode: true,
            dockBorders: true,
        });

        // テーマを設定 and organization
        this.theme = config.theme === 'light' ? THEMES.light : THEMES.dark;
        this.organization = config.organization;

        // グリッドを作成
        this.grid = new contrib.grid({
            rows: 12,
            cols: 12,
            screen: this.screen,
        });

        this.setupWidgets();
        this.setupKeyBindings();
        this.setupEventListeners();
    }

    private setupWidgets(): void {
        // リポジトリのテーブル（左上）
        this.widgets.repositories = createTableWidget(this.grid, {
            position: [0, 0, 4, 6],
            title: '📚 Repositories',
            headers: ['Name', 'Stars', 'Forks', 'Issues'],
            columnWidths: [20, 8, 8, 8],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // プルリクエストのテーブル（右上）
        this.widgets.pullRequests = createTableWidget(this.grid, {
            position: [0, 6, 4, 6],
            title: '🔀 Pull Requests',
            headers: ['Title', 'Author', 'Status', 'Reviews'],
            columnWidths: [25, 15, 10, 8],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // アクティビティチャート（中央左）
        this.widgets.activity = createLineChartWidget(this.grid, {
            position: [4, 0, 4, 6],
            title: '📈 Activity Metrics',
            chartType: 'line',
            showLegend: true,
            style: { fg: this.theme.success },
            border: { fg: this.theme.border },
        });

        // GitHub Actions ステータス（中央右上）
        this.widgets.actions = createTableWidget(this.grid, {
            position: [4, 6, 2, 6],
            title: '⚙️ GitHub Actions',
            headers: ['Workflow', 'Status', 'Duration'],
            columnWidths: [20, 10, 10],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // コントリビュータードーナツチャート（中央右下）
        this.widgets.contributors = createDonutWidget(this.grid, {
            position: [6, 6, 2, 6],
            title: '👥 Top Contributors',
            chartType: 'donut',
            radius: 4,
            arcWidth: 2,
            border: { fg: this.theme.border },
        });

        // 課題テーブル（左下）
        this.widgets.issues = createTableWidget(this.grid, {
            position: [8, 0, 3, 6],
            title: '🐛 Open Issues',
            headers: ['Title', 'Labels', 'Assignee', 'Age'],
            columnWidths: [25, 15, 10, 8],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // ログ（右下）
        this.widgets.logs = createLogWidget(this.grid, {
            position: [8, 6, 3, 6],
            title: '📝 Activity Feed',
            scrollable: true,
            style: { fg: this.theme.info },
            border: { fg: this.theme.border },
        });

        // ステータスバー（下部）
        this.widgets.statusBar = blessed.box({
            parent: this.screen,
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            content: ` ${this.organization ? `Org: ${this.organization} | ` : ''}Press q to quit | r to refresh | Tab to navigate | h for help `,
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
            },
            border: {
                type: 'line',
                fg: this.theme.border as string,
            },
        });
    }

    private setupKeyBindings(): void {
        // 終了
        this.screen.key(['q', 'C-c', 'escape'], () => {
            this.stop();
            process.exit(0);
        });

        // 更新
        this.screen.key(['r', 'R'], () => {
            addLogEntry(this.widgets.logs, 'Manual refresh triggered...', true);
            this.refresh();
        });

        // ウィジェットを操作
        this.screen.key(['tab'], () => {
            this.focusNext();
        });

        // ヘルプ
        this.screen.key(['h', '?'], () => {
            this.showHelp();
        });

        // 課題を作成
        this.screen.key(['i', 'I'], () => {
            this.showCreateIssue();
        });

        // プルリクエストを作成
        this.screen.key(['p', 'P'], () => {
            this.showCreatePR();
        });

        // 通知を表示
        this.screen.key(['n', 'N'], () => {
            this.showNotifications();
        });

        // 組織を切り替え
        this.screen.key(['o', 'O'], () => {
            this.showOrgSelector();
        });
    }

    private setupEventListeners(): void {
        // ダッシュボード更新を監視
        this.orchestrator.on('service:dashboardUpdate', (serviceName, data) => {
            if (serviceName === 'github') {
                this.updateDashboard(data);
            }
        });

        // ログの追加を監視
        this.orchestrator.on('service:logEntry', (serviceName, entry) => {
            if (serviceName === 'github') {
                addLogEntry(this.widgets.logs, entry.message, true);
            }
        });

        // エラーを監視
        this.orchestrator.on('service:error', (serviceName, error) => {
            if (serviceName === 'github') {
                addLogEntry(this.widgets.logs, `❌ Error: ${error}`, true);
            }
        });
    }

    async start(): Promise<void> {
        // 初期レンダー
        this.screen.render();
        addLogEntry(
            this.widgets.logs,
            `🚀 Starting GitHub Dashboard${this.organization ? ` for ${this.organization}` : ''}...`,
            true
        );

        // 初期データ読み込み
        await this.refresh();

        // 自動更新を開始
        if (this.config.refreshInterval) {
            this.refreshTimer = setInterval(() => {
                this.refresh();
            }, this.config.refreshInterval);
        }

        addLogEntry(
            this.widgets.logs,
            `✅ Dashboard ready (refresh: ${this.config.refreshInterval || 'manual'}ms)`,
            true
        );
    }

    async stop(): Promise<void> {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        this.screen.destroy();
    }

    private async refresh(): Promise<void> {
        try {
            const data = await this.orchestrator.getServiceDashboardData('github');
            this.updateDashboard(data);
            this.updateStatusBar(`Last refresh: ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            addLogEntry(this.widgets.logs, `❌ Refresh failed: ${error}`, true);
        }
    }

    private updateDashboard(data: ServiceDashboardData): void {
        // リポジトリのテーブルを更新
        if (this.widgets.repositories && data.repositories) {
            const repos = data.repositories as GitHubRepository[];
            const repoData = repos
                .slice(0, 10)
                .map((r) => [
                    r.name || 'Unknown',
                    r.stars?.toString() || '0',
                    r.forks?.toString() || '0',
                    r.openIssues?.toString() || '0',
                ]);
            updateTableData(
                this.widgets.repositories,
                ['Name', 'Stars', 'Forks', 'Issues'],
                repoData
            );
        }

        // プルリクエストのテーブルを更新
        if (this.widgets.pullRequests && data.pullRequests) {
            const prs = data.pullRequests as GitHubPullRequest[];
            const prData = prs
                .slice(0, 10)
                .map((pr) => [
                    (pr.title || 'Unknown').substring(0, 25),
                    pr.author || 'Unknown',
                    pr.status || 'open',
                    pr.reviewCount?.toString() || '0',
                ]);
            updateTableData(
                this.widgets.pullRequests,
                ['Title', 'Author', 'Status', 'Reviews'],
                prData
            );
        }

        // アクティビティチャートを更新
        if (this.widgets.activity && data.activity) {
            const activity = data.activity as GitHubActivity;
            const last7Days = [...Array(7)]
                .map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    return date.toLocaleDateString('en', { weekday: 'short' });
                })
                .reverse();

            updateChartData(this.widgets.activity, [
                {
                    title: 'Commits',
                    x: last7Days,
                    y: activity.commits?.slice(-7) || Array(7).fill(0),
                    style: { line: 'green' },
                },
                {
                    title: 'PRs',
                    x: last7Days,
                    y: activity.pullRequests?.slice(-7) || Array(7).fill(0),
                    style: { line: 'yellow' },
                },
                {
                    title: 'Issues',
                    x: last7Days,
                    y: activity.issues?.slice(-7) || Array(7).fill(0),
                    style: { line: 'red' },
                },
            ]);
        }

        // GitHub Actions のテーブルを更新
        if (this.widgets.actions && data.actions) {
            const actions = data.actions as GitHubAction[];
            const actionData = actions
                .slice(0, 5)
                .map((a) => [
                    a.name || 'Unknown',
                    this.getStatusIcon(a.status),
                    this.formatDuration(a.duration),
                ]);
            updateTableData(this.widgets.actions, ['Workflow', 'Status', 'Duration'], actionData);
        }

        // コントリビュータードーナツチャートを更新
        if (this.widgets.contributors && data.contributors) {
            const contributors = data.contributors as GitHubContributor[];
            const total = contributors.reduce((sum, c) => sum + (c.contributions || 0), 0) || 1;
            const topContributors = contributors.slice(0, 5);

            updateDonutData(
                this.widgets.contributors,
                topContributors.map((c, i) => ({
                    percent: Math.round((c.contributions / total) * 100),
                    label: c.name || 'Unknown',
                    color: ['green', 'yellow', 'cyan', 'magenta', 'blue'][i],
                }))
            );
        }

        // Update issues table
        if (this.widgets.issues && data.issues) {
            const issues = data.issues as GitHubIssue[];
            const issueData = issues
                .slice(0, 10)
                .map((i) => [
                    (i.title || 'Unknown').substring(0, 25),
                    (i.labels?.join(', ') || 'none').substring(0, 15),
                    i.assignee || 'unassigned',
                    this.formatAge(i.createdAt),
                ]);
            updateTableData(this.widgets.issues, ['Title', 'Labels', 'Assignee', 'Age'], issueData);
        }

        this.screen.render();
    }

    private updateStatusBar(message: string): void {
        if (this.widgets.statusBar) {
            this.widgets.statusBar.setContent(
                ` ${this.organization ? `Org: ${this.organization} | ` : ''}${message} | Press q to quit | r to refresh | Tab to navigate | h for help `
            );
            this.screen.render();
        }
    }

    private focusNext(): void {
        const focusableWidgets = [
            this.widgets.repositories,
            this.widgets.pullRequests,
            this.widgets.actions,
            this.widgets.issues,
            this.widgets.logs,
        ].filter((w) => w);

        const currentIndex = focusableWidgets.findIndex((w) => w === this.screen.focused);
        const nextIndex = (currentIndex + 1) % focusableWidgets.length;

        if (focusableWidgets[nextIndex]) {
            focusableWidgets[nextIndex].focus();
            this.screen.render();
        }
    }

    private showHelp(): void {
        const helpBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '70%',
            content: `
    GitHub Dashboard - Keyboard Shortcuts

    Navigation:
    ──────────────
    q, ESC     : Quit dashboard
    r          : Refresh data
    Tab        : Switch between widgets
    ↑/↓        : Navigate in tables
    Enter      : Select item

    Actions:
    ──────────────
    i          : Create Issue
    p          : Create Pull Request
    n          : View Notifications
    a          : View Actions
    s          : Search
    o          : Switch Organization
    m          : Merge PR

    Mouse:
    ──────────────
    Click to focus widgets
    Scroll to navigate

    Press any key to close...`,
            border: {
                type: 'line',
            },
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
                border: {
                    fg: this.theme.warning,
                },
            },
            scrollable: true,
            keys: true,
            vi: true,
        });

        helpBox.key(['escape', 'q', 'h', '?', 'enter'], () => {
            helpBox.destroy();
            this.screen.render();
        });

        helpBox.focus();
        this.screen.render();
    }

    private showCreateIssue(): void {
        const issueBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '40%',
            content: `
    Create New Issue

    This feature would allow creating a new GitHub issue.
    Currently not implemented in demo mode.

    Press any key to close...`,
            border: {
                type: 'line',
            },
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
                border: {
                    fg: this.theme.info,
                },
            },
        });

        issueBox.key(['escape', 'enter'], () => {
            issueBox.destroy();
            this.screen.render();
        });

        issueBox.focus();
        this.screen.render();
    }

    private showCreatePR(): void {
        const prBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '40%',
            content: `
    Create Pull Request

    This feature would allow creating a new pull request.
    Currently not implemented in demo mode.

    Press any key to close...`,
            border: {
                type: 'line',
            },
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
                border: {
                    fg: this.theme.info,
                },
            },
        });

        prBox.key(['escape', 'enter'], () => {
            prBox.destroy();
            this.screen.render();
        });

        prBox.focus();
        this.screen.render();
    }

    private showNotifications(): void {
        const notifBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '70%',
            height: '60%',
            content: `
    GitHub Notifications

    This feature would show GitHub notifications.
    Currently not implemented in demo mode.

    Press any key to close...`,
            border: {
                type: 'line',
            },
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
                border: {
                    fg: this.theme.info,
                },
            },
            scrollable: true,
            keys: true,
            vi: true,
        });

        notifBox.key(['escape', 'q'], () => {
            notifBox.destroy();
            this.screen.render();
        });

        notifBox.focus();
        this.screen.render();
    }

    private showOrgSelector(): void {
        const orgBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '40%',
            height: '30%',
            content: `
    Select Organization

    Current: ${this.organization || 'Personal'}

    This feature would allow switching organizations.
    Currently not implemented in demo mode.

    Press any key to close...`,
            border: {
                type: 'line',
            },
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
                border: {
                    fg: this.theme.info,
                },
            },
        });

        orgBox.key(['escape', 'enter'], () => {
            orgBox.destroy();
            this.screen.render();
        });

        orgBox.focus();
        this.screen.render();
    }

    private getStatusIcon(status: string): string {
        switch (status?.toLowerCase()) {
            case 'success':
            case 'completed':
                return '✅ Success';
            case 'failure':
            case 'failed':
                return '❌ Failed';
            case 'pending':
            case 'running':
                return '🔄 Running';
            case 'cancelled':
                return '⚫ Cancelled';
            default:
                return '⚪ Unknown';
        }
    }

    private formatDuration(seconds?: number): string {
        if (!seconds) {
            return 'N/A';
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }

    private formatAge(dateStr?: string): string {
        if (!dateStr) {
            return 'Unknown';
        }
        const date = new Date(dateStr);
        const now = new Date();
        const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (days === 0) {
            return 'Today';
        }
        if (days === 1) {
            return '1 day';
        }
        return `${days} days`;
    }
}
