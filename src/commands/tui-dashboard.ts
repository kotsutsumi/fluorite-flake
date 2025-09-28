/**
 * TUI Dashboard commands for Cloudflare Workers monitoring
 */

import chalk from 'chalk';
import ora from 'ora';
import { startTUIDashboard } from '../tui/dashboard.js';

export interface TUIDashboardOptions {
    port?: number;
    host?: string;
    token?: string;
    refreshInterval?: number;
    theme?: 'dark' | 'light';
}

/**
 * Start the TUI Dashboard
 */
export async function startTUI(options: TUIDashboardOptions = {}): Promise<void> {
    const spinner = ora('Starting TUI Dashboard...').start();

    try {
        // Start the dashboard with provided options
        await startTUIDashboard({
            refreshInterval: options.refreshInterval || 5000,
            ipcPort: options.port || 9123,
            ipcHost: options.host || '127.0.0.1',
            ipcToken: options.token,
            theme: options.theme || 'dark',
        });

        spinner.stop();

        // Dashboard is running - control is handed over to the TUI
        // The TUI will handle its own exit process
    } catch (error) {
        spinner.fail('Failed to start TUI Dashboard');
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
    }
}
