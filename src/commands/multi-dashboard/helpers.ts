/**
 * マルチサービスダッシュボード用ヘルパー関数
 *
 * 設定生成、認証、出力表示などの共通処理を提供します。
 *
 * @module helpers
 */

import chalk from 'chalk';
import { startTUIDashboard } from '../../tui/multi-service-dashboard.js';
import type { DashboardOrchestrator } from '../../dashboard/dashboard-orchestrator.js';
import type { DashboardConfig } from '../../dashboard/dashboard-orchestrator.js';
import type { ServiceConfig, AuthConfig } from '../../services/base-service-adapter/index.js';
import type { DashboardOptions } from './types.js';

export function createDashboardConfig(options: DashboardOptions): DashboardConfig {
    return {
        refreshInterval: options.refresh || 5000,
        autoInitServices: [],
        protocol: {
            primary: options.protocol === 'rest' ? 'rest' : 'websocket',
            wsPort: options.port || 9123,
            httpPort: (options.port || 9123) + 1,
            authToken: options.token,
        },
        display: {
            theme: options.theme || 'dark',
            layout: options.layout || 'grid',
            autoRefresh: true,
        },
    };
}

export function createServiceConfig(serviceName: string, options: DashboardOptions): ServiceConfig {
    const config: ServiceConfig = {
        timeout: 30000,
    };

    // オプションに基づいてサービス固有の設定を追加
    if (options.project) {
        config.project = options.project;
    }

    if (options.region) {
        config.region = options.region;
    }

    // サービス固有の設定
    switch (serviceName) {
        case 'vercel':
            if (options.project) {
                config.team = options.project;
            }
            break;
        case 'aws':
            if (options.region) {
                config.region = options.region;
            }
            break;
        case 'supabase':
            if (options.project) {
                config.org = options.project;
            }
            break;
        // 必要に応じて他のサービス固有の設定を追加
    }

    return config;
}

export async function getAuthConfig(
    serviceName: string,
    options: DashboardOptions
): Promise<AuthConfig | undefined> {
    // 実際の実装では、ここで:
    // 1. 環境変数をチェック
    // 2. 保存された認証情報をチェック
    // 3. 必要に応じてユーザーにプロンプト
    // 4. サービス固有の認証方法を使用

    const envVarMap: Record<string, string> = {
        vercel: 'VERCEL_TOKEN',
        supabase: 'SUPABASE_ACCESS_TOKEN',
        turso: 'TURSO_TOKEN',
        aws: 'AWS_ACCESS_KEY_ID',
        github: 'GITHUB_TOKEN',
        cloudflare: 'CLOUDFLARE_API_TOKEN',
    };

    const envVar = envVarMap[serviceName];
    const token = process.env[envVar] || options.token;

    if (!token) {
        console.warn(chalk.yellow(`⚠️  No authentication token found for ${serviceName}`));
        console.log(chalk.gray(`   Set ${envVar} environment variable or use --token option`));
        return undefined;
    }

    return { token };
}

export async function launchTUIDashboard(
    orchestrator: DashboardOrchestrator,
    serviceName: string,
    options: DashboardOptions
): Promise<void> {
    // ここで新しいマルチサービスTUIダッシュボードを使用
    // 単一サービス設定で
    await startTUIDashboard({
        orchestrator,
        services: [serviceName],
        theme: options.theme === 'auto' ? 'dark' : options.theme || 'dark',
        layout: options.layout || 'grid',
        refreshInterval: options.refresh || 5000,
    });
}

export async function launchMultiTUIDashboard(
    orchestrator: DashboardOrchestrator,
    services: string[],
    options: DashboardOptions
): Promise<void> {
    await startTUIDashboard({
        orchestrator,
        services,
        theme: options.theme === 'auto' ? 'dark' : options.theme || 'dark',
        layout: options.layout || 'tabs', // Use tabs for multiple services
        refreshInterval: options.refresh || 5000,
    });
}

export async function displayJSONOutput(
    orchestrator: DashboardOrchestrator,
    serviceName: string,
    _options: DashboardOptions
): Promise<void> {
    try {
        const data = await orchestrator.getServiceDashboardData(serviceName);
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(chalk.red(`Failed to get dashboard data: ${error}`));
        process.exit(1);
    }
}

export async function displayMultiJSONOutput(
    orchestrator: DashboardOrchestrator,
    _options: DashboardOptions
): Promise<void> {
    try {
        const data = await orchestrator.getMultiServiceDashboardData();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(chalk.red(`Failed to get dashboard data: ${error}`));
        process.exit(1);
    }
}

export async function displayCLIOutput(
    orchestrator: DashboardOrchestrator,
    serviceName: string,
    _options: DashboardOptions
): Promise<void> {
    try {
        const data = await orchestrator.getServiceDashboardData(serviceName);

        console.log(chalk.bold.blue(`\n📊 ${serviceName.toUpperCase()} Dashboard`));
        console.log(chalk.gray('─'.repeat(50)));

        // サービス固有のデータを表示 in a readable format
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(chalk.red(`Failed to get dashboard data: ${error}`));
        process.exit(1);
    }
}

export async function displayMultiCLIOutput(
    orchestrator: DashboardOrchestrator,
    _options: DashboardOptions
): Promise<void> {
    try {
        const data = await orchestrator.getMultiServiceDashboardData();

        console.log(chalk.bold.blue('\n📊 Multi-Service Dashboard'));
        console.log(chalk.gray('─'.repeat(50)));

        // 集約された指標を表示
        console.log(chalk.cyan('\n📈 Aggregated Metrics:'));
        console.log(`   Resources: ${data.aggregated.totalResources}`);
        console.log(`   Errors: ${data.aggregated.totalErrors}`);
        console.log(`   Health: ${data.aggregated.overallHealth}`);

        // サービス固有のデータを表示
        for (const [serviceName, serviceData] of Object.entries(data.services)) {
            console.log(chalk.yellow(`\n🔧 ${serviceName.toUpperCase()}:`));
            console.log(JSON.stringify(serviceData, null, 2));
        }
    } catch (error) {
        console.error(chalk.red(`Failed to get dashboard data: ${error}`));
        process.exit(1);
    }
}
