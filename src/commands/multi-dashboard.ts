/**
 * マルチサービスダッシュボードコマンド
 *
 * 複数のクラウドサービスをサポートする統一ダッシュボードコマンド。
 * 古いCloudflare専用ダッシュボードをサービス非依存のアプローチで置き換えます。
 */

import chalk from 'chalk';
import ora from 'ora';
import { DashboardOrchestrator } from '../dashboard/dashboard-orchestrator.js';
import { DefaultServiceFactory } from '../services/service-factory.js';
import { startTUIDashboard } from '../tui/multi-service-dashboard.js';
import type { DashboardConfig } from '../dashboard/dashboard-orchestrator.js';
import type { ServiceConfig, AuthConfig } from '../services/base-service-adapter.js';

// サポートされているサービス
export const SUPPORTED_SERVICES = [
    'vercel',
    'supabase',
    'turso',
    'aws',
    'github',
    'cloudflare',
] as const;

export type SupportedService = (typeof SUPPORTED_SERVICES)[number];

// コマンドオプションのインターフェース
export interface DashboardOptions {
    /** 出力モード */
    mode?: 'cli' | 'tui' | 'json';
    /** TUIモードのテーマ */
    theme?: 'dark' | 'light' | 'auto';
    /** TUIモードのレイアウトスタイル */
    layout?: 'grid' | 'tabs' | 'split';
    /** リフレッシュ間隔（ミリ秒） */
    refresh?: number;
    /** JSON出力形式 */
    json?: boolean;
    /** 通信用ホスト */
    host?: string;
    /** 通信用ポート */
    port?: number;
    /** 認証トークン */
    token?: string;
    /** 通信プロトコル */
    protocol?: 'ws' | 'rest';
    /** プロジェクト/アカウントフィルター */
    project?: string;
    /** リージョンフィルター */
    region?: string;
    /** 環境フィルター */
    env?: string;
    /** マルチモード用のサービス */
    services?: string[];
    /** データ同期を有効化 */
    sync?: boolean;
    /** メトリクス集約を有効化 */
    aggregate?: boolean;
}

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

/**
 * Show all available services and their status
 */
export async function showServiceStatus(): Promise<void> {
    console.log(chalk.bold.blue('\n🚀 Fluorite Flake - Available Services\n'));

    const serviceFactory = new DefaultServiceFactory();
    const allServices = serviceFactory.getAllServiceInfo();

    for (const [name, info] of Object.entries(allServices)) {
        console.log(chalk.cyan(`📦 ${info.displayName} (${name})`));
        console.log(chalk.gray(`   ${info.description}`));

        // 機能を表示
        const capabilities = Object.entries(info.capabilities)
            .filter(([, enabled]) => enabled)
            .map(([cap]) => cap);

        if (capabilities.length > 0) {
            console.log(
                chalk.green(
                    `   ✅ ${capabilities.slice(0, 3).join(', ')}${capabilities.length > 3 ? '...' : ''}`
                )
            );
        }

        console.log();
    }

    console.log(chalk.yellow('Usage:'));
    console.log(
        chalk.gray('  fluorite-flake dashboard <service>        # Single service dashboard')
    );
    console.log(
        chalk.gray('  fluorite-flake dashboard multi <services> # Multi-service dashboard')
    );
    console.log(
        chalk.gray('  fluorite-flake dashboard all              # All configured services')
    );
    console.log();
}

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

// プライベートヘルパー関数

function createDashboardConfig(options: DashboardOptions): DashboardConfig {
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

function createServiceConfig(serviceName: string, options: DashboardOptions): ServiceConfig {
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

async function getAuthConfig(
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

async function launchTUIDashboard(
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

async function launchMultiTUIDashboard(
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

async function displayJSONOutput(
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

async function displayMultiJSONOutput(
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

async function displayCLIOutput(
    orchestrator: DashboardOrchestrator,
    serviceName: string,
    _options: DashboardOptions
): Promise<void> {
    try {
        const data = await orchestrator.getServiceDashboardData(serviceName);

        console.log(chalk.bold.blue(`\n📊 ${serviceName.toUpperCase()} Dashboard`));
        console.log(chalk.gray('─'.repeat(50)));

        // Display service-specific data in a readable format
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(chalk.red(`Failed to get dashboard data: ${error}`));
        process.exit(1);
    }
}

async function displayMultiCLIOutput(
    orchestrator: DashboardOrchestrator,
    _options: DashboardOptions
): Promise<void> {
    try {
        const data = await orchestrator.getMultiServiceDashboardData();

        console.log(chalk.bold.blue('\n📊 Multi-Service Dashboard'));
        console.log(chalk.gray('─'.repeat(50)));

        // Display aggregated metrics
        console.log(chalk.cyan('\n📈 Aggregated Metrics:'));
        console.log(`   Resources: ${data.aggregated.totalResources}`);
        console.log(`   Errors: ${data.aggregated.totalErrors}`);
        console.log(`   Health: ${data.aggregated.overallHealth}`);

        // Display service-specific data
        for (const [serviceName, serviceData] of Object.entries(data.services)) {
            console.log(chalk.yellow(`\n🔧 ${serviceName.toUpperCase()}:`));
            console.log(JSON.stringify(serviceData, null, 2));
        }
    } catch (error) {
        console.error(chalk.red(`Failed to get dashboard data: ${error}`));
        process.exit(1);
    }
}
