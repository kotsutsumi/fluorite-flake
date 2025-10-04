/**
 * 単一サービスダッシュボード起動機能
 *
 * 指定されたサービスの単一ダッシュボードを起動します。
 *
 * @module launchServiceDashboard
 */

import chalk from 'chalk';
import ora from 'ora';
import { DashboardOrchestrator } from '../../dashboard/dashboard-orchestrator.js';
import { DefaultServiceFactory } from '../../services/service-factory/index.js';
import {
    createDashboardConfig,
    createServiceConfig,
    displayCLIOutput,
    displayJSONOutput,
    getAuthConfig,
    launchTUIDashboard,
} from './helpers.js';
import { type DashboardOptions, SUPPORTED_SERVICES, type SupportedService } from './types.js';

/**
 * Launch dashboard for a specific service
 */
export async function launchServiceDashboard(
    serviceName: string,
    options: DashboardOptions = {}
): Promise<void> {
    // サービスを検証
    if (!SUPPORTED_SERVICES.includes(serviceName as SupportedService)) {
        console.error(chalk.red(`❌ Unsupported service: ${serviceName}`));
        console.log(chalk.yellow(`Supported services: ${SUPPORTED_SERVICES.join(', ')}`));
        process.exit(1);
    }

    const spinner = ora(`Initializing ${serviceName} dashboard...`).start();

    try {
        // サービスファクトリーとオーケストレーターを作成
        const serviceFactory = new DefaultServiceFactory();
        const config = createDashboardConfig(options);
        const orchestrator = new DashboardOrchestrator(config, serviceFactory);

        // オーケストレーターを初期化
        await orchestrator.initialize();

        // リクエストされたサービスを追加
        const serviceConfig = createServiceConfig(serviceName, options);
        const authConfig = await getAuthConfig(serviceName, options);

        await orchestrator.addService(serviceName, serviceConfig, authConfig);

        spinner.succeed(`✅ ${serviceName} dashboard initialized`);

        // モードに基づいてダッシュボードを起動
        const mode = options.mode || 'tui';

        switch (mode) {
            case 'tui':
                await launchTUIDashboard(orchestrator, serviceName, options);
                break;

            case 'json':
                await displayJSONOutput(orchestrator, serviceName, options);
                break;

            case 'cli':
                await displayCLIOutput(orchestrator, serviceName, options);
                break;

            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    } catch (error) {
        spinner.fail(`❌ Failed to launch ${serviceName} dashboard`);
        console.error(
            chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
    }
}
