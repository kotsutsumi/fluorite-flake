/**
 * VercelサービスTUIダッシュボード
 *
 * Vercelサービス監視用に特別に設計されたターミナルユーザーインターフェース。
 * デプロイメント、プロジェクト、ドメイン、関数、アナリティクスを表示します。
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import {
    createTableWidget,
    createLineChartWidget,
    // createGaugeWidget,
    createLogWidget,
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
import type { ServiceDashboardData } from '../../services/base-service-adapter.js';

export interface VercelDashboardConfig {
    orchestrator: DashboardOrchestrator;
    theme?: 'dark' | 'light';
    refreshInterval?: number;
}

export class VercelDashboard {
    private screen: blessed.Widgets.Screen;
    private grid: any;
    private widgets: {
        deployments?: any;
        projects?: any;
        domains?: any;
        analytics?: any;
        buildStatus?: any;
        logs?: any;
        statusBar?: any;
    } = {};
    private refreshTimer?: NodeJS.Timeout;
    private theme: (typeof THEMES)[keyof typeof THEMES] = THEMES.dark;

    constructor(
        private orchestrator: DashboardOrchestrator,
        private config: VercelDashboardConfig
    ) {
        // Initialize screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Vercel Dashboard',
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
        // Deployments table (top left)
        this.widgets.deployments = createTableWidget(this.grid, {
            position: [0, 0, 4, 6],
            title: '🚀 Deployments',
            headers: ['Name', 'Status', 'URL', 'Created'],
            columnWidths: [20, 10, 25, 15],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // Projects table (top right)
        this.widgets.projects = createTableWidget(this.grid, {
            position: [0, 6, 4, 6],
            title: '📦 Projects',
            headers: ['Name', 'Framework', 'Updated'],
            columnWidths: [20, 15, 15],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // Analytics chart (middle left)
        this.widgets.analytics = createLineChartWidget(this.grid, {
            position: [4, 0, 4, 6],
            title: '📊 Deployment Analytics',
            chartType: 'line',
            showLegend: true,
            style: { fg: this.theme.success },
            border: { fg: this.theme.border },
        });

        // Build status donut (middle right)
        this.widgets.buildStatus = createDonutWidget(this.grid, {
            position: [4, 6, 4, 6],
            title: '🎯 Build Status',
            chartType: 'donut',
            radius: 6,
            arcWidth: 2,
            border: { fg: this.theme.border },
        });

        // Domains table (bottom left)
        this.widgets.domains = createTableWidget(this.grid, {
            position: [8, 0, 3, 6],
            title: '🌐 Domains',
            headers: ['Domain', 'Status', 'SSL'],
            columnWidths: [25, 10, 10],
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
    }

    private setupEventListeners(): void {
        // Listen for dashboard updates
        this.orchestrator.on('service:dashboardUpdate', (serviceName, data) => {
            if (serviceName === 'vercel') {
                this.updateDashboard(data);
            }
        });

        // Listen for log entries
        this.orchestrator.on('service:logEntry', (serviceName, entry) => {
            if (serviceName === 'vercel') {
                addLogEntry(this.widgets.logs, entry.message, true);
            }
        });

        // Listen for errors
        this.orchestrator.on('service:error', (serviceName, error) => {
            if (serviceName === 'vercel') {
                addLogEntry(this.widgets.logs, `❌ Error: ${error}`, true);
            }
        });
    }

    async start(): Promise<void> {
        // Initial render
        this.screen.render();
        addLogEntry(this.widgets.logs, '🚀 Starting Vercel Dashboard...', true);

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
            const data = await this.orchestrator.getServiceDashboardData('vercel');
            this.updateDashboard(data);
            this.updateStatusBar(`Last refresh: ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            addLogEntry(this.widgets.logs, `❌ Refresh failed: ${error}`, true);
        }
    }

    private updateDashboard(data: ServiceDashboardData): void {
        // Update deployments table
        if (this.widgets.deployments && data.deployments) {
            const deployments = data.deployments as any[];
            const deploymentData = deployments
                .slice(0, 10)
                .map((d) => [
                    d.name || 'Unknown',
                    d.state || 'Unknown',
                    d.url ? d.url.substring(0, 25) : 'N/A',
                    new Date(d.createdAt || 0).toLocaleDateString(),
                ]);
            updateTableData(
                this.widgets.deployments,
                ['Name', 'Status', 'URL', 'Created'],
                deploymentData
            );
        }

        // Update projects table
        if (this.widgets.projects && data.projects) {
            const projects = data.projects as any[];
            const projectData = projects
                .slice(0, 10)
                .map((p) => [
                    p.name || 'Unknown',
                    p.framework || 'N/A',
                    new Date(p.updatedAt || 0).toLocaleDateString(),
                ]);
            updateTableData(this.widgets.projects, ['Name', 'Framework', 'Updated'], projectData);
        }

        // Update domains table
        if (this.widgets.domains && data.domains) {
            const domains = data.domains as any[];
            const domainData = domains.slice(0, 10).map((d) => [
                d.name || 'Unknown',
                d.verified ? '✅' : '❌',
                '✅', // SSL always enabled on Vercel
            ]);
            updateTableData(this.widgets.domains, ['Domain', 'Status', 'SSL'], domainData);
        }

        // Update analytics chart (mock data for now)
        if (this.widgets.analytics && data.deployments) {
            // const _deployments = data.deployments as any[];
            const last7Days = [...Array(7)]
                .map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    return date.toLocaleDateString('en', { weekday: 'short' });
                })
                .reverse();

            updateChartData(this.widgets.analytics, [
                {
                    title: 'Deployments',
                    x: last7Days,
                    y: last7Days.map(() => Math.floor(Math.random() * 10) + 1),
                    style: { line: 'yellow' },
                },
            ]);
        }

        // Update build status donut
        if (this.widgets.buildStatus && data.deployments) {
            const deployments = data.deployments as any[];
            const ready = deployments.filter((d) => d.state === 'READY').length;
            const failed = deployments.filter((d) => d.state === 'ERROR').length;
            const building = deployments.filter((d) => d.state === 'BUILDING').length;
            const total = deployments.length || 1;

            updateDonutData(this.widgets.buildStatus, [
                {
                    percent: Math.round((ready / total) * 100),
                    label: 'Ready',
                    color: 'green',
                },
                {
                    percent: Math.round((failed / total) * 100),
                    label: 'Failed',
                    color: 'red',
                },
                {
                    percent: Math.round((building / total) * 100),
                    label: 'Building',
                    color: 'yellow',
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
            this.widgets.deployments,
            this.widgets.projects,
            this.widgets.domains,
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
    Vercel Dashboard - Keyboard Shortcuts

    Navigation:
    ──────────────
    q, ESC     : Quit dashboard
    r          : Refresh data
    Tab        : Switch between widgets
    ↑/↓        : Navigate in tables
    Enter      : Select item

    Actions:
    ──────────────
    d          : Deploy project
    p          : Promote deployment
    l          : View logs
    a          : View analytics

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
    Deploy Project

    This feature would trigger a deployment.
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
}
