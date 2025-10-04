/**
 * マルチサービスダッシュボード起動機能
 *
 * 複数のサービスを統合したダッシュボードを起動します。
 *
 * @module launchMultiServiceDashboard
 */

import chalk from 'chalk';
import ora from 'ora';
import { DashboardOrchestrator } from '../../dashboard/dashboard-orchestrator.js';
import { DefaultServiceFactory } from '../../services/service-factory/index.js';
import {
    createDashboardConfig,
    createServiceConfig,
    displayMultiCLIOutput,
    displayMultiJSONOutput,
    getAuthConfig,
    launchMultiTUIDashboard,
} from './helpers.js';
import { type DashboardOptions, SUPPORTED_SERVICES, type SupportedService } from './types.js';

/**
 * Launch multi-service dashboard
 */
export async function launchMultiServiceDashboard(
    services: string[],
    options: DashboardOptions = {}
): Promise<void> {
    // すべてのサービスを検証
    const invalidServices = services.filter(
        (s) => !SUPPORTED_SERVICES.includes(s as SupportedService)
    );
    if (invalidServices.length > 0) {
        console.error(chalk.red(`❌ Unsupported services: ${invalidServices.join(', ')}`));
        console.log(chalk.yellow(`Supported services: ${SUPPORTED_SERVICES.join(', ')}`));
        process.exit(1);
    }

    const spinner = ora(
        `Initializing multi-service dashboard for ${services.join(', ')}...`
    ).start();

    try {
        // サービスファクトリーとオーケストレーターを作成
        const serviceFactory = new DefaultServiceFactory();
        const config = createDashboardConfig(options);
        config.autoInitServices = services;

        const orchestrator = new DashboardOrchestrator(config, serviceFactory);

        // オーケストレーターを初期化
        await orchestrator.initialize();

        // リクエストされたすべてのサービスを追加
        for (const serviceName of services) {
            try {
                const serviceConfig = createServiceConfig(serviceName, options);
                const authConfig = await getAuthConfig(serviceName, options);

                await orchestrator.addService(serviceName, serviceConfig, authConfig);
                spinner.text = `✅ ${serviceName} connected, initializing others...`;
            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Failed to connect to ${serviceName}: ${error}`));
                // 他のサービスを続行
            }
        }

        const connectedServices = orchestrator.getRegisteredServices();

        if (connectedServices.length === 0) {
            spinner.fail('❌ No services could be connected');
            process.exit(1);
        }

        spinner.succeed(
            `✅ Multi-service dashboard initialized (${connectedServices.length}/${services.length} services)`
        );

        // ダッシュボードを起動
        const mode = options.mode || 'tui';

        switch (mode) {
            case 'tui':
                await launchMultiTUIDashboard(orchestrator, connectedServices, options);
                break;

            case 'json':
                await displayMultiJSONOutput(orchestrator, options);
                break;

            case 'cli':
                await displayMultiCLIOutput(orchestrator, options);
                break;

            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    } catch (error) {
        spinner.fail('❌ Failed to launch multi-service dashboard');
        console.error(
            chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
    }
}
