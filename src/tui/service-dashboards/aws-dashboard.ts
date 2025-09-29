/**
 * AWS Service TUI Dashboard
 *
 * Terminal user interface specifically designed for AWS services monitoring.
 * Displays EC2 instances, Lambda functions, S3 buckets, RDS databases, and CloudWatch metrics.
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import {
    createTableWidget,
    createLineChartWidget,
    createLogWidget,
    createDonutWidget,
    updateTableData,
    updateChartData,
    updateDonutData,
    addLogEntry,
    THEMES,
} from '../components/base-widget.js';
import type { DashboardOrchestrator } from '../../dashboard/dashboard-orchestrator.js';
import type { ServiceDashboardData } from '../../services/base-service-adapter.js';

export interface AWSDashboardConfig {
    orchestrator: DashboardOrchestrator;
    theme?: 'dark' | 'light';
    refreshInterval?: number;
    region?: string;
}

export class AWSDashboard {
    private screen: blessed.Widgets.Screen;
    private grid: any;
    private widgets: {
        ec2?: any;
        lambda?: any;
        s3?: any;
        rds?: any;
        cloudwatch?: any;
        costs?: any;
        logs?: any;
        statusBar?: any;
    } = {};
    private refreshTimer?: NodeJS.Timeout;
    private theme: (typeof THEMES)[keyof typeof THEMES] = THEMES.dark;
    private region: string;

    constructor(
        private orchestrator: DashboardOrchestrator,
        private config: AWSDashboardConfig
    ) {
        // Initialize screen
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'AWS Dashboard',
            fullUnicode: true,
            dockBorders: true,
        });

        // Set theme and region
        this.theme = config.theme === 'light' ? THEMES.light : THEMES.dark;
        this.region = config.region || 'us-east-1';

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
        // EC2 instances table (top left)
        this.widgets.ec2 = createTableWidget(this.grid, {
            position: [0, 0, 4, 6],
            title: '🖥️ EC2 Instances',
            headers: ['Name', 'Type', 'State', 'IP'],
            columnWidths: [20, 12, 10, 15],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // Lambda functions table (top right)
        this.widgets.lambda = createTableWidget(this.grid, {
            position: [0, 6, 4, 6],
            title: '⚡ Lambda Functions',
            headers: ['Function', 'Runtime', 'Memory', 'Invocations'],
            columnWidths: [20, 10, 8, 12],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // CloudWatch metrics (middle left)
        this.widgets.cloudwatch = createLineChartWidget(this.grid, {
            position: [4, 0, 4, 6],
            title: '📊 CloudWatch Metrics',
            chartType: 'line',
            showLegend: true,
            style: { fg: this.theme.info },
            border: { fg: this.theme.border },
        });

        // Cost breakdown (middle right)
        this.widgets.costs = createDonutWidget(this.grid, {
            position: [4, 6, 4, 6],
            title: '💰 Cost Breakdown',
            chartType: 'donut',
            radius: 6,
            arcWidth: 2,
            border: { fg: this.theme.border },
        });

        // S3 buckets (bottom left)
        this.widgets.s3 = createTableWidget(this.grid, {
            position: [8, 0, 3, 4],
            title: '🪣 S3 Buckets',
            headers: ['Bucket', 'Objects', 'Size'],
            columnWidths: [15, 8, 10],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // RDS databases (bottom center)
        this.widgets.rds = createTableWidget(this.grid, {
            position: [8, 4, 3, 4],
            title: '🗄️ RDS Databases',
            headers: ['DB', 'Engine', 'Status'],
            columnWidths: [12, 10, 10],
            style: {
                fg: this.theme.fg,
                selectedFg: this.theme.selectedFg,
                selectedBg: this.theme.selectedBg,
            },
            border: { fg: this.theme.border },
        });

        // Logs (bottom right)
        this.widgets.logs = createLogWidget(this.grid, {
            position: [8, 8, 3, 4],
            title: '📝 CloudTrail',
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
            content: ` Region: ${this.region} | Press q to quit | r to refresh | Tab to navigate | h for help `,
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

        // EC2 console
        this.screen.key(['e', 'E'], () => {
            this.showEC2Console();
        });

        // Lambda console
        this.screen.key(['l', 'L'], () => {
            this.showLambdaConsole();
        });

        // CloudFormation
        this.screen.key(['c', 'C'], () => {
            this.showCloudFormation();
        });

        // Switch region
        this.screen.key(['g', 'G'], () => {
            this.showRegionSelector();
        });
    }

    private setupEventListeners(): void {
        // Listen for dashboard updates
        this.orchestrator.on('service:dashboardUpdate', (serviceName, data) => {
            if (serviceName === 'aws') {
                this.updateDashboard(data);
            }
        });

        // Listen for log entries
        this.orchestrator.on('service:logEntry', (serviceName, entry) => {
            if (serviceName === 'aws') {
                addLogEntry(this.widgets.logs, entry.message, true);
            }
        });

        // Listen for errors
        this.orchestrator.on('service:error', (serviceName, error) => {
            if (serviceName === 'aws') {
                addLogEntry(this.widgets.logs, `❌ Error: ${error}`, true);
            }
        });
    }

    async start(): Promise<void> {
        // Initial render
        this.screen.render();
        addLogEntry(this.widgets.logs, `🚀 Starting AWS Dashboard (${this.region})...`, true);

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
            const data = await this.orchestrator.getServiceDashboardData('aws');
            this.updateDashboard(data);
            this.updateStatusBar(`Last refresh: ${new Date().toLocaleTimeString()}`);
        } catch (error) {
            addLogEntry(this.widgets.logs, `❌ Refresh failed: ${error}`, true);
        }
    }

    private updateDashboard(data: ServiceDashboardData): void {
        // Update EC2 instances table
        if (this.widgets.ec2 && data.ec2Instances) {
            const instances = data.ec2Instances as any[];
            const ec2Data = instances
                .slice(0, 10)
                .map((i) => [
                    i.name || i.instanceId || 'Unknown',
                    i.instanceType || 'Unknown',
                    i.state || 'Unknown',
                    i.publicIp || 'N/A',
                ]);
            updateTableData(this.widgets.ec2, ['Name', 'Type', 'State', 'IP'], ec2Data);
        }

        // Update Lambda functions table
        if (this.widgets.lambda && data.lambdaFunctions) {
            const functions = data.lambdaFunctions as any[];
            const lambdaData = functions
                .slice(0, 10)
                .map((f) => [
                    f.functionName || 'Unknown',
                    f.runtime || 'Unknown',
                    `${f.memorySize || 0} MB`,
                    f.invocations?.toString() || '0',
                ]);
            updateTableData(
                this.widgets.lambda,
                ['Function', 'Runtime', 'Memory', 'Invocations'],
                lambdaData
            );
        }

        // Update CloudWatch metrics chart
        if (this.widgets.cloudwatch && data.cloudwatchMetrics) {
            const metrics = data.cloudwatchMetrics as any;
            const last24Hours = [...Array(24)]
                .map((_, i) => {
                    const hour = new Date();
                    hour.setHours(hour.getHours() - i);
                    return hour.getHours().toString() + ':00';
                })
                .reverse();

            updateChartData(this.widgets.cloudwatch, [
                {
                    title: 'CPU Usage',
                    x: last24Hours.slice(-12),
                    y: metrics.cpuUsage?.slice(-12) || Array(12).fill(0),
                    style: { line: 'yellow' },
                },
                {
                    title: 'Network In',
                    x: last24Hours.slice(-12),
                    y: metrics.networkIn?.slice(-12) || Array(12).fill(0),
                    style: { line: 'cyan' },
                },
            ]);
        }

        // Update cost breakdown donut
        if (this.widgets.costs && data.costs) {
            const costs = data.costs as any;
            const total = costs.total || 1;

            updateDonutData(this.widgets.costs, [
                {
                    percent: Math.round((costs.ec2 / total) * 100),
                    label: 'EC2',
                    color: 'blue',
                },
                {
                    percent: Math.round((costs.s3 / total) * 100),
                    label: 'S3',
                    color: 'green',
                },
                {
                    percent: Math.round((costs.rds / total) * 100),
                    label: 'RDS',
                    color: 'yellow',
                },
                {
                    percent: Math.round((costs.lambda / total) * 100),
                    label: 'Lambda',
                    color: 'magenta',
                },
                {
                    percent: Math.round((costs.other / total) * 100),
                    label: 'Other',
                    color: 'cyan',
                },
            ]);
        }

        // Update S3 buckets table
        if (this.widgets.s3 && data.s3Buckets) {
            const buckets = data.s3Buckets as any[];
            const s3Data = buckets
                .slice(0, 10)
                .map((b) => [
                    b.name || 'Unknown',
                    b.objectCount?.toString() || '0',
                    this.formatBytes(b.size || 0),
                ]);
            updateTableData(this.widgets.s3, ['Bucket', 'Objects', 'Size'], s3Data);
        }

        // Update RDS databases table
        if (this.widgets.rds && data.rdsDatabases) {
            const databases = data.rdsDatabases as any[];
            const rdsData = databases
                .slice(0, 10)
                .map((db) => [
                    db.dbInstanceIdentifier || 'Unknown',
                    db.engine || 'Unknown',
                    db.status || 'Unknown',
                ]);
            updateTableData(this.widgets.rds, ['DB', 'Engine', 'Status'], rdsData);
        }

        this.screen.render();
    }

    private updateStatusBar(message: string): void {
        if (this.widgets.statusBar) {
            this.widgets.statusBar.setContent(
                ` Region: ${this.region} | ${message} | Press q to quit | r to refresh | Tab to navigate | h for help `
            );
            this.screen.render();
        }
    }

    private focusNext(): void {
        const focusableWidgets = [
            this.widgets.ec2,
            this.widgets.lambda,
            this.widgets.s3,
            this.widgets.rds,
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
    AWS Dashboard - Keyboard Shortcuts

    Navigation:
    ──────────────
    q, ESC     : Quit dashboard
    r          : Refresh data
    Tab        : Switch between widgets
    ↑/↓        : Navigate in tables
    Enter      : Select item

    Actions:
    ──────────────
    e          : EC2 Console
    l          : Lambda Console
    s          : S3 Browser
    d          : RDS Console
    c          : CloudFormation
    w          : CloudWatch
    g          : Change Region

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

    private showEC2Console(): void {
        const ec2Box = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '40%',
            content: `
    EC2 Instance Management

    This feature would provide EC2 instance management.
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

        ec2Box.key(['escape', 'enter'], () => {
            ec2Box.destroy();
            this.screen.render();
        });

        ec2Box.focus();
        this.screen.render();
    }

    private showLambdaConsole(): void {
        const lambdaBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '60%',
            height: '40%',
            content: `
    Lambda Function Management

    This feature would provide Lambda function management.
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

        lambdaBox.key(['escape', 'enter'], () => {
            lambdaBox.destroy();
            this.screen.render();
        });

        lambdaBox.focus();
        this.screen.render();
    }

    private showCloudFormation(): void {
        const cfBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '70%',
            height: '50%',
            content: `
    CloudFormation Stacks

    This feature would show CloudFormation stack management.
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

        cfBox.key(['escape', 'enter'], () => {
            cfBox.destroy();
            this.screen.render();
        });

        cfBox.focus();
        this.screen.render();
    }

    private showRegionSelector(): void {
        const regionBox = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width: '40%',
            height: '30%',
            content: `
    Select AWS Region

    Current: ${this.region}

    This feature would allow changing AWS region.
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

        regionBox.key(['escape', 'enter'], () => {
            regionBox.destroy();
            this.screen.render();
        });

        regionBox.focus();
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
