/**
 * Turso Service TUI Dashboard
 *
 * Terminal user interface specifically designed for Turso database monitoring.
 * Displays databases, replicas, queries, connections, and performance metrics.
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

export interface TursoDashboardConfig {
    orchestrator: DashboardOrchestrator;
    theme?: 'dark' | 'light';
    refreshInterval?: number;
}

export class TursoDashboard {
    private screen: blessed.Widgets.Screen;
    // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib grid uses any types
    private grid: any;
    private widgets: {
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        databases?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        replicas?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        queries?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        connections?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        performance?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        storage?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        logs?: any;
        statusBar?: blessed.Widgets.BoxElement;
    } = {};
    private refreshTimer?: NodeJS.Timeout;
    private theme: (typeof THEMES)[keyof typeof THEMES] = THEMES.dark;

    constructor(
        private orchestrator: DashboardOrchestrator,
        private config: TursoDashboardConfig
    ) {
        // 画面を初期化
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Turso Dashboard',
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
        // Databases table (top left)
        this.widgets.databases = createTableWidget(this.grid, {
            position: [0, 0, 4, 6],
            title: '🗄️ Databases',
            headers: ['Name', 'Region', 'Size', 'Status'],
            columnWidths: [20, 12, 10, 10],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // Replicas table (top right)
        this.widgets.replicas = createTableWidget(this.grid, {
            position: [0, 6, 4, 6],
            title: '🌐 Replicas',
            headers: ['Location', 'Status', 'Latency', 'Sync'],
            columnWidths: [15, 8, 10, 8],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // Query performance chart (middle left)
        this.widgets.queries = createLineChartWidget(this.grid, {
            position: [4, 0, 4, 6],
            title: '📊 Query Performance',
            chartType: 'line',
            showLegend: true,
            style: { fg: this.theme.info },
            border: { fg: this.theme.border },
        });

        // Connection pool gauge (middle center)
        this.widgets.connections = createGaugeWidget(this.grid, {
            position: [4, 6, 4, 3],
            title: '🔗 Connections',
            label: 'Active',
            stroke: this.theme.success,
            fill: this.theme.fg,
            border: { fg: this.theme.border },
        });

        // Storage usage gauge (middle right)
        this.widgets.storage = createGaugeWidget(this.grid, {
            position: [4, 9, 4, 3],
            title: '💾 Storage',
            label: 'Used',
            stroke: this.theme.warning,
            fill: this.theme.fg,
            border: { fg: this.theme.border },
        });

        // パフォーマンス指標（左下）
        this.widgets.performance = createBarChartWidget(this.grid, {
            position: [8, 0, 3, 6],
            title: '⚡ Performance Metrics',
            chartType: 'bar',
            style: { bg: this.theme.info },
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
            style: {
                fg: this.theme.fg,
                bg: this.theme.bg,
            },
            border: {
                type: 'line',
                fg: this.theme.border,
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

        // データベースシェル
        this.screen.key(['s', 'S'], () => {
            this.showDatabaseShell();
        });

        // Create database
        this.screen.key(['c', 'C'], () => {
            this.showCreateDatabase();
        });

        // レプリカ管理
        this.screen.key(['p', 'P'], () => {
            this.showReplicaManagement();
        });
    }

    private setupEventListeners(): void {
        // ダッシュボード更新を監視
        this.orchestrator.on('service:dashboardUpdate', (serviceName, data) => {
            if (serviceName === 'turso') {
                this.updateDashboard(data);
            }
        });

        // ログの追加を監視
        this.orchestrator.on('service:logEntry', (serviceName, entry) => {
            if (serviceName === 'turso') {
                addLogEntry(this.widgets.logs, entry.message, true);
            }
        });

        // エラーを監視
        this.orchestrator.on('service:error', (serviceName, error) => {
            if (serviceName === 'turso') {
                addLogEntry(this.widgets.logs, `❌ Error: ${error}`, true);
            }
        });
    }

    async start(): Promise<void> {
        // 初期レンダー
        this.screen.render();
        addLogEntry(this.widgets.logs, '🚀 Starting Turso Dashboard...', true);

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
            const data = await this.orchestrator.getServiceDashboardData('turso');
            this.updateDashboard(data);
            this.updateStatusBar(`Last refresh: ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            addLogEntry(this.widgets.logs, `❌ Refresh failed: ${error}`, true);
        }
    }

    private updateDashboard(data: ServiceDashboardData): void {
        // データベースのテーブルを更新
        if (this.widgets.databases && data.databases) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const databases = data.databases as any[];
            const dbData = databases
                .slice(0, 10)
                .map((db) => [
                    db.name || 'Unknown',
                    db.region || 'Unknown',
                    this.formatBytes(db.size || 0),
                    db.status || 'Unknown',
                ]);
            updateTableData(this.widgets.databases, ['Name', 'Region', 'Size', 'Status'], dbData);
        }

        // レプリカのテーブルを更新
        if (this.widgets.replicas && data.replicas) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const replicas = data.replicas as any[];
            const replicaData = replicas
                .slice(0, 10)
                .map((r) => [
                    r.location || 'Unknown',
                    r.status || 'Unknown',
                    `${r.latency || 0}ms`,
                    r.syncStatus || 'Unknown',
                ]);
            updateTableData(
                this.widgets.replicas,
                ['Location', 'Status', 'Latency', 'Sync'],
                replicaData
            );
        }

        // クエリ性能チャートを更新
        if (this.widgets.queries && data.queryMetrics) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const metrics = data.queryMetrics as any;
            const last24Hours = [...Array(24)]
                .map((_, i) => {
                    const hour = new Date();
                    hour.setHours(hour.getHours() - i);
                    return `${hour.getHours().toString()}:00`;
                })
                .reverse();

            updateChartData(this.widgets.queries, [
                {
                    title: 'Reads',
                    x: last24Hours.slice(-12),
                    y: metrics.reads?.slice(-12) || Array(12).fill(0),
                    style: { line: 'green' },
                },
                {
                    title: 'Writes',
                    x: last24Hours.slice(-12),
                    y: metrics.writes?.slice(-12) || Array(12).fill(0),
                    style: { line: 'yellow' },
                },
            ]);
        }

        // 接続ゲージを更新
        if (this.widgets.connections && data.connections) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const conn = data.connections as any;
            const activePercent = Math.min(100, (conn.active / conn.max) * 100);
            updateGaugeData(this.widgets.connections, activePercent);
        }

        // ストレージゲージを更新
        if (this.widgets.storage && data.storage) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const storage = data.storage as any;
            const usedPercent = Math.min(100, (storage.used / storage.total) * 100);
            updateGaugeData(this.widgets.storage, usedPercent);
        }

        // パフォーマンス指標を更新
        if (this.widgets.performance && data.performance) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const perf = data.performance as any;
            const perfData = {
                barCategory: ['Read', 'Write', 'Connect'],
                stackedCategory: ['Latency (ms)'],
                data: [
                    [perf.readLatency || 0],
                    [perf.writeLatency || 0],
                    [perf.connectLatency || 0],
                ],
            };
            this.widgets.performance.setData(perfData);
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
            this.widgets.databases,
            this.widgets.replicas,
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
    Turso Dashboard - Keyboard Shortcuts

    Navigation:
    ──────────────
    q, ESC     : Quit dashboard
    r          : Refresh data
    Tab        : Switch between widgets
    ↑/↓        : Navigate in tables
    Enter      : Select item

    Actions:
    ──────────────
    s          : Database Shell
    c          : Create Database
    p          : Manage Replicas
    b          : Backup Database
    m          : Migration Tool

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

    private showDatabaseShell(): void {
        const shellBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '70%',
            height: '50%',
            content: `
    Database Shell

    This feature would provide an interactive SQL shell.
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

        shellBox.key(['escape', 'enter'], () => {
            shellBox.destroy();
            this.screen.render();
        });

        shellBox.focus();
        this.screen.render();
    }

    private showCreateDatabase(): void {
        const createBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: '30%',
            content: `
    Create Database

    This feature would allow creating a new Turso database.
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

        createBox.key(['escape', 'enter'], () => {
            createBox.destroy();
            this.screen.render();
        });

        createBox.focus();
        this.screen.render();
    }

    private showReplicaManagement(): void {
        const replicaBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '40%',
            content: `
    Replica Management

    This feature would allow managing database replicas.
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

        replicaBox.key(['escape', 'enter'], () => {
            replicaBox.destroy();
            this.screen.render();
        });

        replicaBox.focus();
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
