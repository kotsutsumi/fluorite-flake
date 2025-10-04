/**
 * SupabaseサービスTUIダッシュボード
 *
 * Supabase監視用に特別に設計されたターミナルユーザーインターフェース。
 * データベースメトリクス、認証ユーザー、ストレージ、関数、リアルタイム接続を表示します。
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import type { DashboardOrchestrator } from '../../dashboard/dashboard-orchestrator.js';
import type { ServiceDashboardData } from '../../services/base-service-adapter/index.js';
import {
    THEMES,
    addLogEntry,
    createDonutWidget,
    createGaugeWidget,
    createLineChartWidget,
    createLogWidget,
    createTableWidget,
    updateChartData,
    updateDonutData,
    updateGaugeData,
    updateTableData,
    // LAYOUTS
} from '../components/base-widget.js';

export interface SupabaseDashboardConfig {
    orchestrator: DashboardOrchestrator;
    theme?: 'dark' | 'light';
    refreshInterval?: number;
}

export class SupabaseDashboard {
    private screen: blessed.Widgets.Screen;
    // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib grid uses any types
    private grid: any;
    private widgets: {
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        database?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        auth?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        storage?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        functions?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        realtime?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        queries?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widgets use any types
        logs?: any;
        statusBar?: blessed.Widgets.BoxElement;
    } = {};
    private refreshTimer?: NodeJS.Timeout;
    private theme: (typeof THEMES)[keyof typeof THEMES] = THEMES.dark;

    constructor(
        private orchestrator: DashboardOrchestrator,
        private config: SupabaseDashboardConfig
    ) {
        // 画面を初期化
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Supabase Dashboard',
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
        // データベース指標（左上）
        this.widgets.database = createGaugeWidget(this.grid, {
            position: [0, 0, 4, 4],
            title: '🗄️ Database Usage',
            label: 'Storage',
            stroke: this.theme.success,
            fill: this.theme.fg,
            border: { fg: this.theme.border },
        });

        // 認証ユーザーのテーブル（中央上）
        this.widgets.auth = createTableWidget(this.grid, {
            position: [0, 4, 4, 4],
            title: '👤 Auth Users',
            headers: ['Email', 'Provider', 'Last Login'],
            columnWidths: [20, 10, 15],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // ストレージバケットのテーブル（右上）
        this.widgets.storage = createTableWidget(this.grid, {
            position: [0, 8, 4, 4],
            title: '📦 Storage Buckets',
            headers: ['Bucket', 'Files', 'Size'],
            columnWidths: [15, 8, 10],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // クエリ分析（中央左）
        this.widgets.queries = createLineChartWidget(this.grid, {
            position: [4, 0, 4, 6],
            title: '📊 Query Analytics',
            chartType: 'line',
            showLegend: true,
            style: { fg: this.theme.info },
            border: { fg: this.theme.border },
        });

        // 関数ステータス（中央右）
        this.widgets.functions = createTableWidget(this.grid, {
            position: [4, 6, 4, 6],
            title: '⚡ Edge Functions',
            headers: ['Function', 'Status', 'Invocations', 'Errors'],
            columnWidths: [15, 8, 12, 8],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // リアルタイム接続（左下）
        this.widgets.realtime = createDonutWidget(this.grid, {
            position: [8, 0, 3, 6],
            title: '🔄 Realtime Connections',
            chartType: 'donut',
            radius: 6,
            arcWidth: 2,
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

        // SQL エディター
        this.screen.key(['s', 'S'], () => {
            this.showSQLEditor();
        });

        // ユーザー管理
        this.screen.key(['u', 'U'], () => {
            this.showUserManagement();
        });

        // 関数ログ
        this.screen.key(['f', 'F'], () => {
            this.showFunctionLogs();
        });
    }

    private setupEventListeners(): void {
        // ダッシュボード更新を監視
        this.orchestrator.on('service:dashboardUpdate', (serviceName, data) => {
            if (serviceName === 'supabase') {
                this.updateDashboard(data);
            }
        });

        // ログの追加を監視
        this.orchestrator.on('service:logEntry', (serviceName, entry) => {
            if (serviceName === 'supabase') {
                const logsWidget = this.widgets.logs;
                if (logsWidget) {
                    addLogEntry(logsWidget, entry.message, true);
                }
            }
        });

        // エラーを監視
        this.orchestrator.on('service:error', (serviceName, error) => {
            if (serviceName === 'supabase') {
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
            addLogEntry(logsWidgetStart, '🚀 Starting Supabase Dashboard...', true);
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
            const data = await this.orchestrator.getServiceDashboardData('supabase');
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
        // データベースゲージを更新
        if (this.widgets.database && data.database) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const db = data.database as any;
            const usagePercent = db.usagePercent || 0;
            updateGaugeData(this.widgets.database, usagePercent);
        }

        // 認証ユーザーのテーブルを更新
        if (this.widgets.auth && data.authUsers) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const users = data.authUsers as any[];
            const userData = users
                .slice(0, 10)
                .map((u) => [
                    u.email || 'Unknown',
                    u.provider || 'email',
                    new Date(u.lastSignIn || 0).toLocaleString(),
                ]);
            updateTableData(this.widgets.auth, ['Email', 'Provider', 'Last Login'], userData);
        }

        // ストレージバケットのテーブルを更新
        if (this.widgets.storage && data.storageBuckets) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const buckets = data.storageBuckets as any[];
            const bucketData = buckets
                .slice(0, 10)
                .map((b) => [
                    b.name || 'Unknown',
                    b.fileCount?.toString() || '0',
                    this.formatBytes(b.size || 0),
                ]);
            updateTableData(this.widgets.storage, ['Bucket', 'Files', 'Size'], bucketData);
        }

        // クエリ分析チャートを更新
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
                    title: 'Queries',
                    x: last24Hours.slice(-12),
                    y: metrics.queries?.slice(-12) || Array(12).fill(0),
                    style: { line: 'cyan' },
                },
                {
                    title: 'Mutations',
                    x: last24Hours.slice(-12),
                    y: metrics.mutations?.slice(-12) || Array(12).fill(0),
                    style: { line: 'yellow' },
                },
            ]);
        }

        // 関数テーブルを更新
        if (this.widgets.functions && data.functions) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const functions = data.functions as any[];
            const functionData = functions
                .slice(0, 10)
                .map((f) => [
                    f.name || 'Unknown',
                    f.status || 'inactive',
                    f.invocations?.toString() || '0',
                    f.errors?.toString() || '0',
                ]);
            updateTableData(
                this.widgets.functions,
                ['Function', 'Status', 'Invocations', 'Errors'],
                functionData
            );
        }

        // リアルタイム接続のドーナツチャートを更新
        if (this.widgets.realtime && data.realtime) {
            // biome-ignore lint/suspicious/noExplicitAny: ServiceDashboardData uses any for service-specific data
            const rt = data.realtime as any;
            const total = rt.total || 1;
            const active = rt.active || 0;
            const idle = rt.idle || 0;
            const disconnected = total - active - idle;

            updateDonutData(this.widgets.realtime, [
                {
                    percent: Math.round((active / total) * 100),
                    label: 'Active',
                    color: 'green',
                },
                {
                    percent: Math.round((idle / total) * 100),
                    label: 'Idle',
                    color: 'yellow',
                },
                {
                    percent: Math.round((disconnected / total) * 100),
                    label: 'Disconnected',
                    color: 'red',
                },
            ]);
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
            this.widgets.auth,
            this.widgets.storage,
            this.widgets.functions,
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
    Supabase Dashboard - Keyboard Shortcuts

    Navigation:
    ──────────────
    q, ESC     : Quit dashboard
    r          : Refresh data
    Tab        : Switch between widgets
    ↑/↓        : Navigate in tables
    Enter      : Select item

    Actions:
    ──────────────
    s          : SQL Editor
    u          : User Management
    f          : Function Logs
    b          : Browse Storage
    t          : Table Editor

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

    private showSQLEditor(): void {
        const sqlBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '70%',
            height: '50%',
            content: `
    SQL Editor

    This feature would provide an interactive SQL editor.
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

        sqlBox.key(['escape', 'enter'], () => {
            sqlBox.destroy();
            this.screen.render();
        });

        sqlBox.focus();
        this.screen.render();
    }

    private showUserManagement(): void {
        const userBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '40%',
            content: `
    User Management

    This feature would allow managing auth users.
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

        userBox.key(['escape', 'enter'], () => {
            userBox.destroy();
            this.screen.render();
        });

        userBox.focus();
        this.screen.render();
    }

    private showFunctionLogs(): void {
        const logsBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '70%',
            height: '70%',
            content: `
    Edge Function Logs

    This feature would show edge function execution logs.
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
