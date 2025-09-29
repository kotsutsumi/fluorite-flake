/**
 * Cloudflare Workers監視用TUIダッシュボード
 *
 * Cloudflare Workers、R2バケット、KVネームスペースのリアルタイム監視用の
 * インタラクティブターミナルダッシュボードです。
 *
 * blessedとblessed-contribライブラリを使用して美しいUIを提供し、
 * キーボードショートカット、マウス操作、ライブデータ更新をサポートします。
 * IPC経由でFluorite Flake CLIと連携し、Cloudflare APIのデータを取得します。
 *
 * @module TUIDashboard
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { createIPCClient, type IPCClient } from '../ipc/ipc-client.js';
import type { WranglerDashboardData } from '../utils/wrangler-dashboard.js';

/**
 * ダッシュボードの設定オプション
 *
 * @interface DashboardOptions
 */
export interface DashboardOptions {
    /** ダッシュボードの自動更新間隔（ミリ秒、デフォルト: 5000） */
    refreshInterval?: number;
    /** IPCサーバーのTCPポート番号（デフォルト: 9123） */
    ipcPort?: number;
    /** IPCサーバーのホスト名（デフォルト: 127.0.0.1） */
    ipcHost?: string;
    /** IPCサーバーの認証トークン */
    ipcToken?: string;
    /** UIテーマ（'dark' | 'light'、デフォルト: 'dark'） */
    theme?: 'dark' | 'light';
}

/**
 * TUIダッシュボードの実装
 *
 * blessedライブラリを使用したターミナルユーザーインターフェースで、
 * Cloudflareリソースのリアルタイム監視を提供します。
 *
 * グリッドレイアウトで構成されたウィジェット（テーブル、グラフ、ログボックス）を
 * 配置し、キーボードショートカットで操作できます。
 * IPCクライアントを使用してバックエンドからデータを取得し、
 * 定期的に更新して最新の情報を表示します。
 *
 * @class TUIDashboard
 *
 * @example
 * ```typescript
 * const dashboard = new TUIDashboard({ refreshInterval: 3000 });
 * await dashboard.start();
 * ```
 */
export class TUIDashboard {
    /** Blessedスクリーンインスタンス */
    private screen: blessed.Widgets.Screen;
    /** グリッドレイアウトマネージャ */
    // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib types are not available
    private grid: any;
    /** IPCクライアント接続 */
    private ipcClient: IPCClient | null = null;
    /** データ更新の間隔時間（ミリ秒） */
    private refreshInterval: number;
    /** 自動更新用タイマー */
    private refreshTimer?: NodeJS.Timeout;
    /** ダッシュボードのウィジェット群 */
    private widgets: {
        /** Workers情報表示テーブル */
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        workersTable?: any;
        /** R2バケット情報表示テーブル */
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        r2Table?: any;
        /** KVネームスペース情報表示テーブル */
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        kvTable?: any;
        /** ログ表示ボックス */
        // biome-ignore lint/suspicious/noExplicitAny: blessed widget types are not available
        logBox?: any;
        /** ステータスバー */
        // biome-ignore lint/suspicious/noExplicitAny: blessed widget types are not available
        statusBar?: any;
        /** アナリティクスグラフ */
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        analyticsLine?: any;
        /** リソース使用率ゲージ */
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        resourceGauge?: any;
    } = {};

    constructor(private options: DashboardOptions = {}) {
        this.refreshInterval = options.refreshInterval || 5000;

        // Blessedスクリーンを作成
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Fluorite Flake - Cloudflare Dashboard',
            fullUnicode: true,
        });

        // グリッドレイアウトを作成
        this.grid = new contrib.grid({
            rows: 12,
            cols: 12,
            screen: this.screen,
        });

        this.setupWidgets();
        this.setupKeyBindings();
    }

    /**
     * ダッシュボードウィジェットのセットアップ
     *
     * グリッドレイアウト上に各種ウィジェット（テーブル、グラフ、ログボックス）を
     * 配置し、それぞれのスタイルと動作を設定します。
     * キーボードナビゲーション、マウス操作、色テーマなども設定します。
     *
     * @private
     */
    private setupWidgets(): void {
        // Workersテーブル（左上）
        this.widgets.workersTable = this.grid.set(0, 0, 4, 6, contrib.table, {
            keys: true,
            fg: 'white',
            selectedFg: 'white',
            selectedBg: 'blue',
            interactive: true,
            label: '📦 Workers',
            width: '50%',
            height: '30%',
            border: { type: 'line', fg: 'cyan' },
            columnSpacing: 3,
            columnWidth: [20, 15, 25],
        });

        // R2バケットテーブル（右上）
        this.widgets.r2Table = this.grid.set(0, 6, 4, 6, contrib.table, {
            keys: true,
            fg: 'white',
            selectedFg: 'white',
            selectedBg: 'blue',
            interactive: true,
            label: '🪣 R2 Buckets',
            width: '50%',
            height: '30%',
            border: { type: 'line', fg: 'cyan' },
            columnSpacing: 3,
            columnWidth: [20, 15, 15],
        });

        // KV Namespaces table (middle left)
        this.widgets.kvTable = this.grid.set(4, 0, 4, 6, contrib.table, {
            keys: true,
            fg: 'white',
            selectedFg: 'white',
            selectedBg: 'blue',
            interactive: true,
            label: '🗄️ KV Namespaces',
            width: '50%',
            height: '30%',
            border: { type: 'line', fg: 'cyan' },
            columnSpacing: 3,
            columnWidth: [15, 25, 10],
        });

        // Analytics line chart (middle right)
        this.widgets.analyticsLine = this.grid.set(4, 6, 4, 6, contrib.line, {
            style: {
                line: 'yellow',
                text: 'green',
                baseline: 'black',
            },
            xLabelPadding: 3,
            xPadding: 5,
            showLegend: true,
            wholeNumbersOnly: false,
            label: '📊 Analytics',
            border: { type: 'line', fg: 'cyan' },
        });

        // Resource gauge (bottom left)
        this.widgets.resourceGauge = this.grid.set(8, 0, 3, 3, contrib.gauge, {
            label: '🔋 Resource Usage',
            stroke: 'green',
            fill: 'white',
            border: { type: 'line', fg: 'cyan' },
        });

        // Log box (bottom middle and right)
        this.widgets.logBox = this.grid.set(8, 3, 3, 9, blessed.log, {
            fg: 'green',
            selectedFg: 'green',
            label: '📝 Logs',
            border: { type: 'line', fg: 'cyan' },
            scrollable: true,
            alwaysScroll: true,
            mouse: true,
            keys: true,
            vi: true,
        });

        // Status bar (bottom)
        this.widgets.statusBar = this.grid.set(11, 0, 1, 12, blessed.box, {
            content: ' Press q to quit | r to refresh | ↑↓ to navigate | Enter to select ',
            border: { type: 'line', fg: 'cyan' },
            style: {
                fg: 'white',
                bg: 'black',
            },
        });
    }

    /**
     * キーボードショートカットのセットアップ
     *
     * ダッシュボードの操作に必要なキーボードショートカットを設定します。
     * 終了、更新、ナビゲーション、ヘルプ表示などの機能を
     * 直感的なキー操作で利用できるようにします。
     *
     * @private
     */
    private setupKeyBindings(): void {
        // qまESCで終了
        this.screen.key(['q', 'C-c', 'escape'], () => {
            this.stop();
            process.exit(0);
        });

        // rで手動更新
        this.screen.key(['r', 'R'], () => {
            this.logMessage('Manual refresh triggered...');
            this.refresh();
        });

        // Tabでウィジェット間を移動
        this.screen.key(['tab'], () => {
            this.focusNext();
        });

        // hまたは?でヘルプ表示
        this.screen.key(['h', '?'], () => {
            this.showHelp();
        });
    }

    /**
     * IPCサーバーへの接続
     *
     * 設定されたホストとポートでIPCサーバーに接続し、
     * ダッシュボードデータの取得を可能にします。
     * 接続状態のイベントハンドラも設定し、自動再接続機能を提供します。
     *
     * @private
     * @returns Promise<void> 接続が完了したら解決されるPromise
     */
    async connect(): Promise<void> {
        try {
            this.ipcClient = createIPCClient({
                port: this.options.ipcPort || 9123,
                host: this.options.ipcHost || '127.0.0.1',
                authToken: this.options.ipcToken,
                reconnect: true,
                reconnectInterval: 5000,
            });

            await this.ipcClient.connect();
            this.logMessage('✅ Connected to IPC server');

            // イベントハンドラの設定
            this.ipcClient.on('disconnected', () => {
                this.logMessage('⚠️ Disconnected from IPC server');
                this.updateStatusBar('Disconnected - Attempting reconnection...');
            });

            this.ipcClient.on('connected', () => {
                this.logMessage('✅ Reconnected to IPC server');
                this.refresh();
            });

            this.ipcClient.on('error', (error) => {
                this.logMessage(`❌ IPC Error: ${error.message}`);
            });
        } catch (error) {
            this.logMessage(`❌ Failed to connect: ${(error as Error).message}`);
            this.updateStatusBar('Failed to connect to IPC server');
        }
    }

    /**
     * ダッシュボードの起動
     *
     * TUIダッシュボードを初期化し、IPCサーバーに接続して
     * データの取得と表示を開始します。自動更新タイマーを設定し、
     * ユーザーがダッシュボードを操作できる状態にします。
     *
     * @returns Promise<void> ダッシュボードが起動したら解決されるPromise
     */
    async start(): Promise<void> {
        // 初期レンダリング
        this.screen.render();

        this.logMessage('🚀 Starting Fluorite Flake TUI Dashboard...');
        this.logMessage('📡 Connecting to IPC server...');

        // IPCサーバーに接続
        await this.connect();

        // 初期データ読み込み
        await this.refresh();

        // 自動更新を開始
        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, this.refreshInterval);

        this.logMessage(`🔄 Auto-refresh enabled (${this.refreshInterval / 1000}s interval)`);
    }

    /**
     * ダッシュボードの停止
     *
     * 自動更新タイマーを停止し、IPC接続を切断し、
     * スクリーンをクリーンアップしてダッシュボードを終了します。
     * リソースの解放とクリーンアップを確実に実行します。
     *
     * @example
     * ```typescript
     * dashboard.stop();
     * ```
     */
    stop(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        if (this.ipcClient) {
            this.ipcClient.disconnect();
        }

        this.screen.destroy();
    }

    /**
     * ダッシュボードデータの更新
     *
     * IPCサーバーから最新のダッシュボードデータを取得し、
     * 全てのウィジェットを更新して最新の情報を表示します。
     * 接続状態を確認し、エラーハンドリングも行います。
     *
     * @private
     * @returns Promise<void> 更新が完了したら解決されるPromise
     */
    private async refresh(): Promise<void> {
        if (!this.ipcClient?.isConnected()) {
            this.logMessage('⚠️ Not connected to IPC server');
            return;
        }

        try {
            // Fetch dashboard data
            const data = await this.ipcClient.call('dashboard.getData');
            this.updateDashboard(data);
            this.updateStatusBar(`Last refresh: ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            this.logMessage(`❌ Refresh failed: ${(error as Error).message}`);
        }
    }

    /**
     * Update dashboard with new data
     */
    private updateDashboard(data: WranglerDashboardData): void {
        // Update workers table
        if (this.widgets.workersTable) {
            const workersData = {
                headers: ['Name', 'Routes', 'Usage Model'],
                data: data.workers.map((w) => [
                    w.name,
                    w.routes?.join(', ') || 'None',
                    w.usage_model || 'bundled',
                ]),
            };
            this.widgets.workersTable.setData(workersData);
        }

        // Update R2 buckets table
        if (this.widgets.r2Table) {
            const r2Data = {
                headers: ['Name', 'Location', 'Created'],
                data: data.r2Buckets.map((b) => [
                    b.name,
                    b.location || 'Unknown',
                    b.created_on || 'Unknown',
                ]),
            };
            this.widgets.r2Table.setData(r2Data);
        }

        // Update KV namespaces table
        if (this.widgets.kvTable) {
            const kvData = {
                headers: ['ID', 'Title', 'Encoding'],
                data: data.kvNamespaces.map((ns) => [
                    `${ns.id.substring(0, 12)}...`,
                    ns.title,
                    ns.supports_url_encoding ? 'Yes' : 'No',
                ]),
            };
            this.widgets.kvTable.setData(kvData);
        }

        // Update analytics if available
        if (data.analytics && this.widgets.analyticsLine) {
            const series = {
                title: 'Requests',
                x: ['Success', 'Error'],
                y: [data.analytics.requests.success, data.analytics.requests.error],
            };
            this.widgets.analyticsLine.setData([series]);
        }

        // Update resource gauge (mock data for now)
        if (this.widgets.resourceGauge) {
            const usage = Math.round(Math.random() * 100);
            this.widgets.resourceGauge.setPercent(usage);
        }

        this.screen.render();
    }

    /**
     * Log a message to the log box
     */
    private logMessage(message: string): void {
        if (this.widgets.logBox) {
            const timestamp = new Date().toLocaleTimeString();
            this.widgets.logBox.log(`[${timestamp}] ${message}`);
            this.screen.render();
        }
    }

    /**
     * Update status bar
     */
    private updateStatusBar(message: string): void {
        if (this.widgets.statusBar) {
            this.widgets.statusBar.setContent(
                ` ${message} | Press q to quit | r to refresh | h for help `
            );
            this.screen.render();
        }
    }

    /**
     * Focus next widget
     */
    private focusNext(): void {
        const focusableWidgets = [
            this.widgets.workersTable,
            this.widgets.r2Table,
            this.widgets.kvTable,
            this.widgets.logBox,
        ].filter((w) => w);

        const currentIndex = focusableWidgets.findIndex((w) => w === this.screen.focused);
        const nextIndex = (currentIndex + 1) % focusableWidgets.length;

        if (focusableWidgets[nextIndex]) {
            focusableWidgets[nextIndex].focus();
            this.screen.render();
        }
    }

    /**
     * Show help dialog
     */
    private showHelp(): void {
        const helpBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '50%',
            height: '50%',
            content: `
    Fluorite Flake TUI Dashboard - Help

    Keyboard Shortcuts:
    ─────────────────────
    q, ESC     : Quit
    r          : Refresh data
    Tab        : Switch focus
    h, ?       : Show this help
    ↑/↓        : Navigate in tables
    Enter      : Select item

    Mouse:
    ─────────────────────
    Click to focus widgets
    Scroll to navigate logs

    Press any key to close...`,
            border: {
                type: 'line',
            },
            style: {
                fg: 'white',
                bg: 'black',
                border: {
                    fg: 'yellow',
                },
            },
        });

        helpBox.key(['escape', 'q', 'h', '?'], () => {
            helpBox.destroy();
            this.screen.render();
        });

        helpBox.focus();
        this.screen.render();
    }
}

/**
 * TUIダッシュボードの作成と起動
 *
 * 新しいTUIダッシュボードインスタンスを作成し、初期化と起動を行います。
 * この関数は便利なファクトリ関数として機能し、ダッシュボードの作成から
 * 起動までを一度に実行します。戻り値として起動済みのダッシュボードインスタンスを返します。
 *
 * @param options - ダッシュボードの設定オプション（オプション）
 * @returns Promise<TUIDashboard> 起動済みのTUIダッシュボードインスタンス
 *
 * @example
 * ```typescript
 * // デフォルト設定で起動
 * const dashboard = await startTUIDashboard();
 *
 * // カスタム設定で起動
 * const dashboard = await startTUIDashboard({
 *   refreshInterval: 3000,
 *   ipcPort: 9123,
 *   theme: 'light'
 * });
 *
 * // 認証付きで起動
 * const dashboard = await startTUIDashboard({
 *   ipcToken: 'my-secret-token',
 *   ipcHost: 'remote-host'
 * });
 * ```
 */
export async function startTUIDashboard(options?: DashboardOptions): Promise<TUIDashboard> {
    const dashboard = new TUIDashboard(options);
    await dashboard.start();
    return dashboard;
}
