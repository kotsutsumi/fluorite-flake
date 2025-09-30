/**
 * CloudflareサービスTUIダッシュボード
 *
 * Cloudflare Workers監視用に特別に設計されたターミナルユーザーインターフェース。
 * Workers、デプロイメント、KVネームスペース、R2バケット、アナリティクスを表示します。
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import {
    createTableWidget,
    createLineChartWidget,
    createGaugeWidget,
    createLogWidget,
    createBarChartWidget,
    updateTableData,
    updateChartData,
    updateGaugeData,
    addLogEntry,
    THEMES,
    // LAYOUTS
} from '../components/base-widget.js';
import type { DashboardOrchestrator } from '../../dashboard/dashboard-orchestrator.js';
import type { ServiceDashboardData } from '../../services/base-service-adapter/index.js';

// Cloudflare Dashboard data interfaces
interface CloudflareWorker {
    name?: string;
    status?: string;
    requests?: number;
    errors?: number;
    route?: string;
    deployed?: boolean;
}

interface CloudflareAnalytics {
    requests?: number[];
    bandwidth?: number[];
    cached?: number[];
    errors?: number[];
}

interface CloudflarePerformance {
    avgResponseTime: number;
}

interface CloudflareErrors {
    [code: string]: number | undefined;
    timeout?: number;
}

interface CloudflareKVNamespace {
    name?: string;
    title?: string;
    id?: string;
    keys?: number;
}

interface CloudflareR2Bucket {
    name?: string;
    creation_date?: string;
    objects?: number;
    size?: number;
}

export interface CloudflareDashboardConfig {
    orchestrator: DashboardOrchestrator;
    theme?: 'dark' | 'light';
    refreshInterval?: number;
}

export class CloudflareDashboard {
    private screen: blessed.Widgets.Screen;
    private grid: contrib.grid;
    private widgets: {
        // biome-ignore lint/suspicious/noExplicitAny: Widget types are complex and mixed
        [key: string]: any;
        statusBar?: blessed.Widgets.BoxElement;
    } = {};
    private refreshTimer?: NodeJS.Timeout;
    private theme: (typeof THEMES)[keyof typeof THEMES] = THEMES.dark;

    constructor(
        private orchestrator: DashboardOrchestrator,
        private config: CloudflareDashboardConfig
    ) {
        // 画面を初期化
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Cloudflare Dashboard',
            fullUnicode: true,
            dockBorders: true,
        });

        // テーマを設定
        this.theme = config.theme === 'light' ? THEMES.light : THEMES.dark;

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
        // ワーカーのテーブル（左上）
        this.widgets.workers = createTableWidget(this.grid, {
            position: [0, 0, 4, 6],
            title: '⚙️ Workers',
            headers: ['Name', 'Status', 'Requests', 'Errors'],
            columnWidths: [20, 10, 12, 10],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // リクエストチャート（右上）
        this.widgets.requests = createLineChartWidget(this.grid, {
            position: [0, 6, 4, 6],
            title: '📊 Request Analytics',
            chartType: 'line',
            showLegend: true,
            style: { fg: this.theme.success },
            border: { fg: this.theme.border },
        });

        // パフォーマンスゲージ（中央左）
        this.widgets.performance = createGaugeWidget(this.grid, {
            position: [4, 0, 4, 4],
            title: '⚡ Performance',
            label: 'Avg Response Time',
            stroke: this.theme.warning,
            fill: this.theme.fg,
            border: { fg: this.theme.border },
        });

        // エラーレートの棒グラフ（中央）
        this.widgets.errors = createBarChartWidget(this.grid, {
            position: [4, 4, 4, 4],
            title: '❌ Error Rates',
            chartType: 'bar',
            style: { bg: this.theme.error },
            border: { fg: this.theme.border },
        });

        // KV ネームスペースのテーブル（中央右）
        this.widgets.kvNamespaces = createTableWidget(this.grid, {
            position: [4, 8, 4, 4],
            title: '🗄️ KV Namespaces',
            headers: ['Name', 'Keys'],
            columnWidths: [15, 8],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // R2 バケットのテーブル（左下）
        this.widgets.r2Buckets = createTableWidget(this.grid, {
            position: [8, 0, 3, 6],
            title: '🪣 R2 Buckets',
            headers: ['Name', 'Objects', 'Size'],
            columnWidths: [20, 10, 10],
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
            title: '📝 Activity Logs',
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
            content: ' Press q to quit | r to refresh | Tab to navigate | h for help ',
            border: {
                type: 'line',
            },
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
                border: {
                    fg: this.theme.border,
                },
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
            const logsWidget = this.widgets.logs;
            if (logsWidget) {
                addLogEntry(logsWidget, 'Manual refresh triggered...', true);
            }
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

        // デプロイ
        this.screen.key(['d', 'D'], () => {
            this.showDeployDialog();
        });

        // ログを追跡
        this.screen.key(['l', 'L'], () => {
            this.showLogsDialog();
        });
    }

    private setupEventListeners(): void {
        // ダッシュボード更新を監視
        this.orchestrator.on('service:dashboardUpdate', (serviceName, data) => {
            if (serviceName === 'cloudflare') {
                this.updateDashboard(data);
            }
        });

        // ログの追加を監視
        this.orchestrator.on('service:logEntry', (serviceName, entry) => {
            if (serviceName === 'cloudflare') {
                const logsWidget = this.widgets.logs;
                if (logsWidget) {
                    addLogEntry(logsWidget, entry.message, true);
                }
            }
        });

        // エラーを監視
        this.orchestrator.on('service:error', (serviceName, error) => {
            if (serviceName === 'cloudflare') {
                const logsWidget = this.widgets.logs;
                if (logsWidget) {
                    addLogEntry(logsWidget, `❌ Error: ${error}`, true);
                }
            }
        });
    }

    async start(): Promise<void> {
        // 初期レンダー
        this.screen.render();
        const logsWidgetStart = this.widgets.logs;
        if (logsWidgetStart) {
            addLogEntry(logsWidgetStart, '🚀 Starting Cloudflare Dashboard...', true);
        }

        // 初期データ読み込み
        await this.refresh();

        // 自動更新を開始
        if (this.config.refreshInterval) {
            this.refreshTimer = setInterval(() => {
                this.refresh();
            }, this.config.refreshInterval);
        }

        const logsWidgetReady = this.widgets.logs;
        if (logsWidgetReady) {
            addLogEntry(
                logsWidgetReady,
                `✅ Dashboard ready (refresh: ${this.config.refreshInterval || 'manual'}ms)`,
                true
            );
        }
    }

    async stop(): Promise<void> {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        this.screen.destroy();
    }

    private async refresh(): Promise<void> {
        try {
            const data = await this.orchestrator.getServiceDashboardData('cloudflare');
            this.updateDashboard(data);
            this.updateStatusBar(`Last refresh: ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            const logsWidgetError = this.widgets.logs;
            if (logsWidgetError) {
                addLogEntry(logsWidgetError, `❌ Refresh failed: ${error}`, true);
            }
        }
    }

    private updateDashboard(data: ServiceDashboardData): void {
        // Update workers table
        if (this.widgets.workers && data.workers) {
            const workers = data.workers as CloudflareWorker[];
            const workerData = workers
                .slice(0, 10)
                .map((w) => [
                    w.name || 'Unknown',
                    w.status || 'Unknown',
                    w.requests?.toString() || '0',
                    w.errors?.toString() || '0',
                ]);
            updateTableData(
                this.widgets.workers,
                ['Name', 'Status', 'Requests', 'Errors'],
                workerData
            );
        }

        // リクエスト分析チャートを更新
        if (this.widgets.requests && data.analytics) {
            const analytics = data.analytics as CloudflareAnalytics;
            const last24Hours = [...Array(24)]
                .map((_, i) => {
                    const hour = new Date();
                    hour.setHours(hour.getHours() - i);
                    return `${hour.getHours().toString()}:00`;
                })
                .reverse();

            updateChartData(this.widgets.requests, [
                {
                    title: 'Requests',
                    x: last24Hours.slice(-12),
                    y: analytics.requests?.slice(-12) || Array(12).fill(0),
                    style: { line: 'cyan' },
                },
                {
                    title: 'Cached',
                    x: last24Hours.slice(-12),
                    y: analytics.cached?.slice(-12) || Array(12).fill(0),
                    style: { line: 'green' },
                },
            ]);
        }

        // パフォーマンスゲージを更新
        if (this.widgets.performance && data.performance) {
            const perf = data.performance as CloudflarePerformance;
            const avgResponseTime = perf.avgResponseTime || 0;
            // Convert to percentage (assuming 1000ms = 100%)
            const percent = Math.min(100, (avgResponseTime / 1000) * 100);
            updateGaugeData(this.widgets.performance, 100 - percent); // Invert for better UX
        }

        // エラーレートを更新
        if (this.widgets.errors && data.errors) {
            const errors = data.errors as CloudflareErrors;
            const errorData = {
                barCategory: ['4xx', '5xx', 'Timeout'],
                stackedCategory: ['Errors'],
                data: [[errors['4xx'] || 0], [errors['5xx'] || 0], [errors.timeout || 0]],
            };
            this.widgets.errors.setData(errorData);
        }

        // KV ネームスペースのテーブルを更新
        if (this.widgets.kvNamespaces && data.kvNamespaces) {
            const namespaces = data.kvNamespaces as CloudflareKVNamespace[];
            const kvData = namespaces
                .slice(0, 10)
                .map((kv) => [kv.name || 'Unknown', kv.keys?.toString() || '0']);
            updateTableData(this.widgets.kvNamespaces, ['Name', 'Keys'], kvData);
        }

        // R2 バケットのテーブルを更新
        if (this.widgets.r2Buckets && data.r2Buckets) {
            const buckets = data.r2Buckets as CloudflareR2Bucket[];
            const bucketData = buckets
                .slice(0, 10)
                .map((b) => [
                    b.name || 'Unknown',
                    b.objects?.toString() || '0',
                    this.formatBytes(b.size || 0),
                ]);
            updateTableData(this.widgets.r2Buckets, ['Name', 'Objects', 'Size'], bucketData);
        }

        this.screen.render();
    }

    private updateStatusBar(message: string): void {
        if (this.widgets.statusBar) {
            this.widgets.statusBar.setContent(
                ` ${message} | Press q to quit | r to refresh | Tab to navigate | h for help `
            );
            this.screen.render();
        }
    }

    private focusNext(): void {
        const focusableWidgets = [
            this.widgets.workers,
            this.widgets.kvNamespaces,
            this.widgets.r2Buckets,
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
            height: '60%',
            content: `
    Cloudflare Dashboard - Keyboard Shortcuts

    Navigation:
    ──────────────
    q, ESC     : Quit dashboard
    r          : Refresh data
    Tab        : Switch between widgets
    ↑/↓        : Navigate in tables
    Enter      : Select item

    Actions:
    ──────────────
    d          : Deploy worker
    l          : Tail logs
    k          : Manage KV namespace
    b          : Manage R2 buckets

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
        });

        helpBox.key(['escape', 'q', 'h', '?', 'enter'], () => {
            helpBox.destroy();
            this.screen.render();
        });

        helpBox.focus();
        this.screen.render();
    }

    private showDeployDialog(): void {
        const deployBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: '30%',
            content: `
    Deploy Worker

    This feature would trigger a worker deployment.
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

        deployBox.key(['escape', 'enter'], () => {
            deployBox.destroy();
            this.screen.render();
        });

        deployBox.focus();
        this.screen.render();
    }

    private showLogsDialog(): void {
        const logsBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '70%',
            height: '70%',
            content: `
    Worker Logs (Live Tail)

    This feature would show live worker logs.
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
            mouse: true,
        });

        logsBox.key(['escape', 'q'], () => {
            logsBox.destroy();
            this.screen.render();
        });

        logsBox.focus();
        this.screen.render();
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) {
            return '0 B';
        }
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
    }
}
