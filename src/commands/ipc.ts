/**
 * IPC command for starting the inter-process communication server
 */

import chalk from 'chalk';
import ora from 'ora';
import { startIPCDaemon, setupIPCServer } from '../ipc/ipc-integration.js';
import { createIPCClient } from '../ipc/ipc-client.js';

/**
 * Start the IPC server daemon
 */
export async function startIPC(options: {
    port?: number;
    socketPath?: string;
    daemon?: boolean;
    verbose?: boolean;
    authToken?: string;
}) {
    if (options.daemon) {
        // Start as daemon
        await startIPCDaemon({
            port: options.port,
            socketPath: options.socketPath,
            authToken: options.authToken,
            verbose: options.verbose,
        });
    } else {
        // Start in foreground
        const spinner = ora('Starting IPC server...').start();

        try {
            const server = setupIPCServer({
                port: options.port,
                socketPath: options.socketPath,
                authToken: options.authToken,
            });

            server.on('listening', (info) => {
                spinner.succeed('IPC server started');
                console.log(chalk.cyan('Server info:'));
                console.log(chalk.gray('─'.repeat(50)));

                if ('socketPath' in info) {
                    console.log(`Socket: ${chalk.green(info.socketPath)}`);
                } else {
                    console.log(`Address: ${chalk.green(`${info.host}:${info.port}`)}`);
                }
                console.log(`Token: ${chalk.yellow(info.token)}`);
                console.log(chalk.gray('─'.repeat(50)));
                console.log(chalk.gray('Press Ctrl+C to stop the server'));
            });

            server.on('connection', () => {
                console.log(chalk.blue('→ Client connected'));
            });

            server.on('disconnection', () => {
                console.log(chalk.gray('← Client disconnected'));
            });

            server.on('error', (error) => {
                console.error(chalk.red('Server error:'), error);
            });

            await server.start();

            // Handle shutdown
            process.on('SIGINT', async () => {
                console.log(`\n${chalk.yellow('Shutting down server...')}`);
                await server.stop();
                process.exit(0);
            });
        } catch (error) {
            spinner.fail('Failed to start IPC server');
            console.error(chalk.red((error as Error).message));
            process.exit(1);
        }
    }
}

/**
 * Test IPC connection
 */
export async function testIPC(options: {
    port?: number;
    socketPath?: string;
    host?: string;
    authToken?: string;
}) {
    const spinner = ora('Connecting to IPC server...').start();

    try {
        const client = createIPCClient({
            port: options.port || 9123,
            socketPath: options.socketPath,
            host: options.host,
            authToken: options.authToken,
            timeout: 5000,
        });

        await client.connect();
        spinner.succeed('Connected to IPC server');

        // Test ping
        const pingSpinner = ora('Testing ping...').start();
        const pingResult = await client.call('system.ping');
        pingSpinner.succeed(`Ping successful: ${JSON.stringify(pingResult)}`);

        // Get version
        const versionSpinner = ora('Getting version...').start();
        const versionResult = await client.call('system.version');
        versionSpinner.succeed(`Version: ${versionResult.version} (Node ${versionResult.node})`);

        // Get dashboard data
        const dashboardSpinner = ora('Getting dashboard data...').start();
        try {
            const dashboardData = await client.call('dashboard.getData');
            dashboardSpinner.succeed('Dashboard data retrieved');
            console.log(chalk.cyan('\nDashboard Summary:'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(`Workers: ${dashboardData.workers.length}`);
            console.log(`R2 Buckets: ${dashboardData.r2Buckets.length}`);
            console.log(`KV Namespaces: ${dashboardData.kvNamespaces.length}`);
        } catch (_error) {
            dashboardSpinner.warn('Dashboard not available (Wrangler may not be configured)');
        }

        client.disconnect();
        console.log(chalk.green('\n✓ IPC connection test successful'));
    } catch (error) {
        spinner.fail('Failed to connect to IPC server');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
    }
}
