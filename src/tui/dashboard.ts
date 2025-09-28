/**
 * TUI Dashboard for Cloudflare Workers monitoring
 *
 * Interactive terminal dashboard for real-time monitoring
 * of Cloudflare Workers, R2 buckets, and KV namespaces.
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { createIPCClient, type IPCClient } from '../ipc/ipc-client.js';
import type { WranglerDashboardData } from '../utils/wrangler-dashboard.js';

/**
 * Dashboard configuration options
 */
export interface DashboardOptions {
    refreshInterval?: number;
    ipcPort?: number;
    ipcHost?: string;
    ipcToken?: string;
    theme?: 'dark' | 'light';
}

/**
 * TUI Dashboard implementation
 */
export class TUIDashboard {
    private screen: blessed.Widgets.Screen;
    // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib types are not available
    private grid: any;
    private ipcClient: IPCClient | null = null;
    private refreshInterval: number;
    private refreshTimer?: NodeJS.Timeout;
    private widgets: {
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        workersTable?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        r2Table?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        kvTable?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed widget types are not available
        logBox?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed widget types are not available
        statusBar?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        analyticsLine?: any;
        // biome-ignore lint/suspicious/noExplicitAny: blessed-contrib widget types are not available
        resourceGauge?: any;
    } = {};

    constructor(private options: DashboardOptions = {}) {
        this.refreshInterval = options.refreshInterval || 5000;

        // Create blessed screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Fluorite Flake - Cloudflare Dashboard',
            fullUnicode: true,
        });

        // Create grid layout
        this.grid = new contrib.grid({
            rows: 12,
            cols: 12,
            screen: this.screen,
        });

        this.setupWidgets();
        this.setupKeyBindings();
    }

    /**
     * Setup dashboard widgets
     */
    private setupWidgets(): void {
        // Workers table (top left)
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

        // R2 Buckets table (top right)
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
     * Setup keyboard shortcuts
     */
    private setupKeyBindings(): void {
        // Quit on q or ESC
        this.screen.key(['q', 'C-c', 'escape'], () => {
            this.stop();
            process.exit(0);
        });

        // Manual refresh on r
        this.screen.key(['r', 'R'], () => {
            this.logMessage('Manual refresh triggered...');
            this.refresh();
        });

        // Tab between widgets
        this.screen.key(['tab'], () => {
            this.focusNext();
        });

        // Help on h or ?
        this.screen.key(['h', '?'], () => {
            this.showHelp();
        });
    }

    /**
     * Connect to IPC server
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

            // Setup event handlers
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
     * Start the dashboard
     */
    async start(): Promise<void> {
        // Initial render
        this.screen.render();

        this.logMessage('🚀 Starting Fluorite Flake TUI Dashboard...');
        this.logMessage('📡 Connecting to IPC server...');

        // Connect to IPC server
        await this.connect();

        // Initial data load
        await this.refresh();

        // Start auto-refresh
        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, this.refreshInterval);

        this.logMessage(`🔄 Auto-refresh enabled (${this.refreshInterval / 1000}s interval)`);
    }

    /**
     * Stop the dashboard
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
     * Refresh dashboard data
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
 * Create and start TUI dashboard
 */
export async function startTUIDashboard(options?: DashboardOptions): Promise<TUIDashboard> {
    const dashboard = new TUIDashboard(options);
    await dashboard.start();
    return dashboard;
}
