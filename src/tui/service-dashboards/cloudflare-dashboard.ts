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
import type { ServiceDashboardData } from '../../services/base-service-adapter.js';

export interface CloudflareDashboardConfig {
    orchestrator: DashboardOrchestrator;
    theme?: 'dark' | 'light';
    refreshInterval?: number;
}

export class CloudflareDashboard {
    private screen: blessed.Widgets.Screen;
    private grid: any;
    private widgets: {
        workers?: any;
        requests?: any;
        performance?: any;
        kvNamespaces?: any;
        r2Buckets?: any;
        errors?: any;
        logs?: any;
        statusBar?: any;
    } = {};
    private refreshTimer?: NodeJS.Timeout;
    private theme: (typeof THEMES)[keyof typeof THEMES] = THEMES.dark;

    constructor(
        private orchestrator: DashboardOrchestrator,
        private config: CloudflareDashboardConfig
    ) {
        // Initialize screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Cloudflare Dashboard',
            fullUnicode: true,
            dockBorders: true,
        });

        // Set theme
        this.theme = config.theme === 'light' ? THEMES.light : THEMES.dark;

        // Create grid
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
        // Workers table (top left)
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

        // Requests chart (top right)
        this.widgets.requests = createLineChartWidget(this.grid, {
            position: [0, 6, 4, 6],
            title: '📊 Request Analytics',
            chartType: 'line',
            showLegend: true,
            style: { fg: this.theme.success },
            border: { fg: this.theme.border },
        });

        // Performance gauges (middle left)
        this.widgets.performance = createGaugeWidget(this.grid, {
            position: [4, 0, 4, 4],
            title: '⚡ Performance',
            label: 'Avg Response Time',
            stroke: this.theme.warning,
            fill: this.theme.fg,
            border: { fg: this.theme.border },
        });

        // Error rate bar chart (middle center)
        this.widgets.errors = createBarChartWidget(this.grid, {
            position: [4, 4, 4, 4],
            title: '❌ Error Rates',
            chartType: 'bar',
            style: { bg: this.theme.error },
            border: { fg: this.theme.border },
        });

        // KV Namespaces table (middle right)
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

        // R2 Buckets table (bottom left)
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

        // Logs (bottom right)
        this.widgets.logs = createLogWidget(this.grid, {
            position: [8, 6, 3, 6],
            title: '📝 Activity Logs',
            scrollable: true,
            style: { fg: this.theme.info },
            border: { fg: this.theme.border },
        });

        // Status bar (bottom)
        this.widgets.statusBar = blessed.box({
            parent: this.screen,
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            content: ' Press q to quit | r to refresh | Tab to navigate | h for help ',
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
            },
            border: {
                type: 'line',
                fg: this.theme.border as any,
            },
        });
    }

    private setupKeyBindings(): void {
        // Quit
        this.screen.key(['q', 'C-c', 'escape'], () => {
            this.stop();
            process.exit(0);
        });

        // Refresh
        this.screen.key(['r', 'R'], () => {
            addLogEntry(this.widgets.logs, 'Manual refresh triggered...', true);
            this.refresh();
        });

        // Navigate widgets
        this.screen.key(['tab'], () => {
            this.focusNext();
        });

        // Help
        this.screen.key(['h', '?'], () => {
            this.showHelp();
        });

        // Deploy
        this.screen.key(['d', 'D'], () => {
            this.showDeployDialog();
        });

        // Tail logs
        this.screen.key(['l', 'L'], () => {
            this.showLogsDialog();
        });
    }

    private setupEventListeners(): void {
        // Listen for dashboard updates
        this.orchestrator.on('service:dashboardUpdate', (serviceName, data) => {
            if (serviceName === 'cloudflare') {
                this.updateDashboard(data);
            }
        });

        // Listen for log entries
        this.orchestrator.on('service:logEntry', (serviceName, entry) => {
            if (serviceName === 'cloudflare') {
                addLogEntry(this.widgets.logs, entry.message, true);
            }
        });

        // Listen for errors
        this.orchestrator.on('service:error', (serviceName, error) => {
            if (serviceName === 'cloudflare') {
                addLogEntry(this.widgets.logs, `❌ Error: ${error}`, true);
            }
        });
    }

    async start(): Promise<void> {
        // Initial render
        this.screen.render();
        addLogEntry(this.widgets.logs, '🚀 Starting Cloudflare Dashboard...', true);

        // Initial data load
        await this.refresh();

        // Start auto-refresh
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
            const data = await this.orchestrator.getServiceDashboardData('cloudflare');
            this.updateDashboard(data);
            this.updateStatusBar(`Last refresh: ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            addLogEntry(this.widgets.logs, `❌ Refresh failed: ${error}`, true);
        }
    }

    private updateDashboard(data: ServiceDashboardData): void {
        // Update workers table
        if (this.widgets.workers && data.workers) {
            const workers = data.workers as any[];
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

        // Update request analytics chart
        if (this.widgets.requests && data.analytics) {
            const analytics = data.analytics as any;
            const last24Hours = [...Array(24)]
                .map((_, i) => {
                    const hour = new Date();
                    hour.setHours(hour.getHours() - i);
                    return hour.getHours().toString() + ':00';
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

        // Update performance gauge
        if (this.widgets.performance && data.performance) {
            const perf = data.performance as any;
            const avgResponseTime = perf.avgResponseTime || 0;
            // Convert to percentage (assuming 1000ms = 100%)
            const percent = Math.min(100, (avgResponseTime / 1000) * 100);
            updateGaugeData(this.widgets.performance, 100 - percent); // Invert for better UX
        }

        // Update error rates
        if (this.widgets.errors && data.errors) {
            const errors = data.errors as any;
            const errorData = {
                barCategory: ['4xx', '5xx', 'Timeout'],
                stackedCategory: ['Errors'],
                data: [[errors['4xx'] || 0], [errors['5xx'] || 0], [errors.timeout || 0]],
            };
            this.widgets.errors.setData(errorData);
        }

        // Update KV namespaces table
        if (this.widgets.kvNamespaces && data.kvNamespaces) {
            const namespaces = data.kvNamespaces as any[];
            const kvData = namespaces
                .slice(0, 10)
                .map((kv) => [kv.name || 'Unknown', kv.keys?.toString() || '0']);
            updateTableData(this.widgets.kvNamespaces, ['Name', 'Keys'], kvData);
        }

        // Update R2 buckets table
        if (this.widgets.r2Buckets && data.r2Buckets) {
            const buckets = data.r2Buckets as any[];
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
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
