/**
 * サイドカーモード起動機能
 *
 * Tauri サイドカーモードでダッシュボードを起動します。
 *
 * @module launchSidecarMode
 */

import chalk from 'chalk';
import ora from 'ora';
import { DashboardOrchestrator } from '../../dashboard/dashboard-orchestrator.js';
import { DefaultServiceFactory } from '../../services/service-factory/index.js';
import { createDashboardConfig } from './helpers.js';
import type { DashboardOptions } from './types.js';

/**
 * Launch Tauri sidecar mode
 */
export async function launchSidecarMode(options: DashboardOptions = {}): Promise<void> {
    const spinner = ora('Starting Tauri sidecar mode...').start();

    try {
        // サービスファクトリーとオーケストレーターを作成
        const serviceFactory = new DefaultServiceFactory();
        const config = createDashboardConfig(options);

        // サイドカーモード用に設定
        config.protocol.primary = 'websocket';
        config.protocol.wsPort = options.port || 9123;
        config.autoInitServices = options.services || [];

        const orchestrator = new DashboardOrchestrator(config, serviceFactory);

        // オーケストレーターを初期化
        await orchestrator.initialize();

        spinner.succeed(`✅ Sidecar mode started on port ${config.protocol.wsPort}`);

        console.log(chalk.blue('🔗 Sidecar Details:'));
        console.log(chalk.gray(`   WebSocket: ws://localhost:${config.protocol.wsPort}`));
        console.log(chalk.gray('   Protocol: JSON-RPC 2.0'));
        console.log(
            chalk.gray(`   Services: ${orchestrator.getRegisteredServices().join(', ') || 'none'}`)
        );
        console.log();
        console.log(chalk.yellow('Press Ctrl+C to stop'));

        // プロセスを維持
        process.on('SIGINT', async () => {
            console.log(chalk.yellow('\n🛑 Shutting down sidecar...'));
            await orchestrator.shutdown();
            process.exit(0);
        });

        // プロセスを実行中のまま保つ
        await new Promise(() => {
            // 永久に実行
        });
    } catch (error) {
        spinner.fail('❌ Failed to start sidecar mode');
        console.error(
            chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
    }
}
