#!/usr/bin/env node
/**
 * Fluorite-flake CLI エントリーポイント
 * マルチフレームワーク対応のプロジェクトジェネレーターCLIの実装
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import chalk from 'chalk';

import { createProject } from './commands/create/index.js';
import type { ProjectConfig } from './commands/create/types.js';
import {
    setLocale,
    getCliDescription,
    getCreateCommandDescription,
    getLocaleOptionDescription,
    formatInvalidOption,
    getMissingArgsMessage,
    getOrmRequiredMessage,
    getInvalidR2ActionMessage,
} from './utils/i18n.js';

// ES Modules環境で__filename と __dirname を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * コマンドライン引数からロケール設定を検索する関数
 * --localeまたは-Lオプションの値を取得
 * @param argv - コマンドライン引数配列
 * @returns ロケール文字列またはundefined
 */
function findLocaleArgument(argv: string[]): string | undefined {
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        // スペース区切りの形式（例: --locale ja または -L ja）をチェック
        if ((arg === '--locale' || arg === '-L') && index + 1 < argv.length) {
            return argv[index + 1];
        }
        // イコール区切りの形式（例: --locale=ja または -L=ja）をチェック
        if (arg?.startsWith('--locale=') || arg?.startsWith('-L=')) {
            return arg.split('=')[1];
        }
    }
    return undefined;
}

// CLIの早い段階でロケールを設定（Commander初期化前に実行）
const forcedLocaleFromArgv = findLocaleArgument(process.argv);
setLocale(forcedLocaleFromArgv);

// package.jsonからバージョン情報を読み込み
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

// Commanderインスタンスの作成
const program = new Command();

// CLIの基本設定（名前、説明、バージョン、グローバルオプション）
program
    .name('fluorite-flake')
    .description(getCliDescription())
    .version(packageJson.version)
    .option('-L, --locale <locale>', getLocaleOptionDescription());

/**
 * preActionフック：コマンド実行前にロケールを再設定
 * Commanderがオプションを解析した後、実際のアクションが実行される前に呼ばれる
 */
program.hook('preAction', (thisCommand) => {
    // Commander v9以降とv8以前の両方に対応
    const opts =
        typeof thisCommand.optsWithGlobals === 'function'
            ? thisCommand.optsWithGlobals()
            : thisCommand.opts();
    // ロケールオプションが指定されている場合は設定を更新
    if (opts?.locale) {
        setLocale(opts.locale);
    }
});

/**
 * createコマンド：プロジェクトテンプレート生成の中核コマンド
 * Next.js、Expo、Tauri、Flutter等のフレームワークに対応
 */
program
    .command('create')
    .alias('new') // エイリアス：'fluorite-flake new'でも実行可能
    .description(getCreateCommandDescription())
    .option('--name <name>', 'Project name')
    .option('--path <path>', 'Project path')
    .option('--framework <framework>', 'Framework (nextjs, expo, tauri, flutter)')
    .option('--database <database>', 'Database (none, turso, supabase)')
    .option('--orm <orm>', 'ORM (prisma, drizzle)')
    .option(
        '--storage <storage>',
        'Storage (none, vercel-blob, cloudflare-r2, aws-s3, supabase-storage)'
    )
    .option('--no-deployment', 'Skip deployment configuration')
    .option('--no-auth', 'Skip authentication setup')
    .option('--package-manager <manager>', 'Package manager (npm, pnpm, yarn, bun)')
    .option('--mode <mode>', 'Mode (full, test)')
    .action(async (options) => {
        // CLIオプションから設定オブジェクトを構築
        const config: Partial<ProjectConfig> = {};

        // 各CLIオプションを設定オブジェクトにマッピング
        if (options.name) {
            config.projectName = options.name;
        }
        if (options.path) {
            config.projectPath = options.path;
        }
        if (options.framework) {
            if (['nextjs', 'expo', 'tauri', 'flutter'].includes(options.framework)) {
                config.framework = options.framework as ProjectConfig['framework'];
            } else {
                console.error(formatInvalidOption('framework', options.framework));
                process.exit(1);
            }
        }
        if (options.database) {
            if (['none', 'turso', 'supabase'].includes(options.database)) {
                config.database = options.database as ProjectConfig['database'];
            } else {
                console.error(formatInvalidOption('database', options.database));
                process.exit(1);
            }
        }
        if (options.orm) {
            if (['prisma', 'drizzle'].includes(options.orm)) {
                config.orm = options.orm as ProjectConfig['orm'];
            } else {
                console.error(formatInvalidOption('orm', options.orm));
                process.exit(1);
            }
        }
        if (options.storage) {
            if (
                ['none', 'vercel-blob', 'cloudflare-r2', 'aws-s3', 'supabase-storage'].includes(
                    options.storage
                )
            ) {
                config.storage = options.storage as ProjectConfig['storage'];
            } else {
                console.error(formatInvalidOption('storage', options.storage));
                process.exit(1);
            }
        }
        if (options.deployment !== undefined) {
            config.deployment = options.deployment;
        }
        if (options.auth !== undefined) {
            config.auth = options.auth;
        }
        if (options.packageManager) {
            if (['npm', 'pnpm', 'yarn', 'bun'].includes(options.packageManager)) {
                config.packageManager = options.packageManager as ProjectConfig['packageManager'];
            } else {
                console.error(formatInvalidOption('packageManager', options.packageManager));
                process.exit(1);
            }
        }
        if (options.mode) {
            if (['full', 'minimal', 'test'].includes(options.mode)) {
                config.mode =
                    options.mode === 'test' ? 'minimal' : (options.mode as ProjectConfig['mode']);
            } else {
                console.error(formatInvalidOption('mode', options.mode));
                process.exit(1);
            }
        }

        // CLIモードでの実行時（対話モードでない場合）の検証処理
        const hasCliArgs = Object.keys(options).some(
            (key) => key !== 'deployment' && key !== 'auth' && options[key] !== undefined
        );
        if (hasCliArgs) {
            // CLIモードで必須となる引数が揃っているか確認
            if (
                !options.name ||
                !options.framework ||
                !options.path ||
                options.database === undefined ||
                options.storage === undefined ||
                options.packageManager === undefined
            ) {
                console.error(getMissingArgsMessage());
                process.exit(1);
            }
            // データベースを使用する場合はORMの指定が必須
            if (options.database && options.database !== 'none' && !options.orm) {
                console.error(getOrmRequiredMessage());
                process.exit(1);
            }
        }

        await createProject(config);
    });

/**
 * dashboardコマンド：マルチサービスダッシュボード
 * Vercel、Supabase、Turso、AWS、GitHub、Cloudflareなど複数のクラウドサービスに対応
 */
const dashboardCommand = program
    .command('dashboard [service]')
    .description(
        'マルチサービスクラウドダッシュボード（オプションでサービス指定可能: vercel, supabase, turso, aws, github, cloudflare）'
    )
    .option('--mode <mode>', 'Output mode (tui, cli, json)', 'tui')
    .option('--theme <theme>', 'Color theme (dark, light, auto)', 'dark')
    .option('--layout <layout>', 'Layout style (grid, tabs, split)', 'grid')
    .option('--refresh <interval>', 'Refresh interval in milliseconds', '5000')
    .option('--json', 'Output as JSON (same as --mode json)')
    .option('--host <host>', 'Host for communication', '127.0.0.1')
    .option('--port <port>', 'Port for communication', '9123')
    .option('--token <token>', '認証トークン')
    .option('--protocol <protocol>', 'Communication protocol (ws, rest)', 'ws')
    .option('--project <project>', 'Project/account filter')
    .option('--region <region>', 'Region filter')
    .option('--env <environment>', 'Environment filter')
    .action(async (service, options) => {
        const { showServiceStatus, launchServiceDashboard } = await import(
            './commands/multi-dashboard.js'
        );

        // サービス指定がない場合はマルチサービスダッシュボードを表示
        if (!service) {
            await showServiceStatus();
            return;
        }

        // --jsonフラグをモードオーバーライドとして処理
        if (options.json) {
            options.mode = 'json';
        }

        await launchServiceDashboard(service, {
            mode: options.mode,
            theme: options.theme,
            layout: options.layout,
            refresh: options.refresh ? Number.parseInt(options.refresh) : undefined,
            json: options.json,
            host: options.host,
            port: options.port ? Number.parseInt(options.port) : undefined,
            token: options.token,
            protocol: options.protocol,
            project: options.project,
            region: options.region,
            env: options.env,
        });
    });

// マルチサービスダッシュボードのサブコマンド
dashboardCommand
    .command('multi <services...>')
    .description('複数サービスのダッシュボードを起動')
    .option('--mode <mode>', 'Output mode (tui, cli, json)', 'tui')
    .option('--theme <theme>', 'Color theme (dark, light, auto)', 'dark')
    .option('--layout <layout>', 'Layout style (grid, tabs, split)', 'tabs')
    .option('--refresh <interval>', 'Refresh interval in milliseconds', '5000')
    .option('--json', 'Output as JSON (same as --mode json)')
    .option('--host <host>', 'Host for communication', '127.0.0.1')
    .option('--port <port>', 'Port for communication', '9123')
    .option('--token <token>', '認証トークン')
    .option('--protocol <protocol>', 'Communication protocol (ws, rest)', 'ws')
    .option('--sync', 'サービス間でのデータ同期を有効化')
    .option('--aggregate', 'メトリクス集約を有効化')
    .action(async (services, options) => {
        const { launchMultiServiceDashboard } = await import('./commands/multi-dashboard.js');

        // --jsonフラグをモードオーバーライドとして処理
        if (options.json) {
            options.mode = 'json';
        }

        await launchMultiServiceDashboard(services, {
            mode: options.mode,
            theme: options.theme,
            layout: options.layout,
            refresh: options.refresh ? Number.parseInt(options.refresh) : undefined,
            json: options.json,
            host: options.host,
            port: options.port ? Number.parseInt(options.port) : undefined,
            token: options.token,
            protocol: options.protocol,
            sync: options.sync,
            aggregate: options.aggregate,
            services: services,
        });
    });

// 全サービスダッシュボードのサブコマンド
dashboardCommand
    .command('all')
    .description('設定済みの全サービスのダッシュボードを起動')
    .option('--mode <mode>', 'Output mode (tui, cli, json)', 'tui')
    .option('--theme <theme>', 'Color theme (dark, light, auto)', 'dark')
    .option('--layout <layout>', 'Layout style (grid, tabs, split)', 'tabs')
    .option('--refresh <interval>', 'Refresh interval in milliseconds', '5000')
    .option('--json', 'Output as JSON (same as --mode json)')
    .option('--host <host>', 'Host for communication', '127.0.0.1')
    .option('--port <port>', 'Port for communication', '9123')
    .option('--token <token>', '認証トークン')
    .option('--protocol <protocol>', 'Communication protocol (ws, rest)', 'ws')
    .option('--sync', 'サービス間でのデータ同期を有効化')
    .option('--aggregate', 'メトリクス集約を有効化')
    .action(async (options) => {
        const { launchMultiServiceDashboard } = await import('./commands/multi-dashboard.js');

        // --jsonフラグをモードオーバーライドとして処理
        if (options.json) {
            options.mode = 'json';
        }

        // サポート対象の全サービス
        const allServices = ['vercel', 'supabase', 'turso', 'aws', 'github', 'cloudflare'];

        await launchMultiServiceDashboard(allServices, {
            mode: options.mode,
            theme: options.theme,
            layout: options.layout,
            refresh: options.refresh ? Number.parseInt(options.refresh) : undefined,
            json: options.json,
            host: options.host,
            port: options.port ? Number.parseInt(options.port) : undefined,
            token: options.token,
            protocol: options.protocol,
            sync: options.sync,
            aggregate: options.aggregate,
            services: allServices,
        });
    });

// Tauriサイドカーモードのサブコマンド
dashboardCommand
    .command('sidecar')
    .description('Tauriサイドカーモードでダッシュボードを起動')
    .option('--port <port>', 'WebSocketポート', '9123')
    .option('--host <host>', 'バインドするホスト', '127.0.0.1')
    .option('--token <token>', '認証トークン')
    .option('--services <services>', '初期化するサービスのカンマ区切りリスト')
    .action(async (options) => {
        const { launchSidecarMode } = await import('./commands/multi-dashboard.js');

        const services = options.services
            ? options.services.split(',').map((s: string) => s.trim())
            : [];

        await launchSidecarMode({
            port: options.port ? Number.parseInt(options.port) : undefined,
            host: options.host,
            token: options.token,
            services: services,
        });
    });

/**
 * deployコマンド：Cloudflare Workerのデプロイ実行
 * dry-run機能付きで安全なデプロイをサポート
 */
program
    .command('deploy [name]')
    .description('Cloudflare Workerをデプロイ')
    .option('--env <environment>', 'ターゲット環境')
    .option('--no-dry-run', 'ドライランをスキップして即座にデプロイ')
    .action(async (name, options) => {
        const { deployWorker } = await import('./commands/dashboard.js');
        await deployWorker(name, {
            env: options.env,
            dryRun: options.dryRun,
        });
    });

/**
 * r2コマンド：Cloudflare R2バケットの管理
 * list（一覧表示）、create（作成）、delete（削除）のアクションに対応
 */
program
    .command('r2 <action> [bucket-name]')
    .description('R2バケットの管理（アクション: list, create, delete）')
    .action(async (action, bucketName) => {
        const { manageR2Bucket } = await import('./commands/dashboard.js');
        if (!['list', 'create', 'delete'].includes(action)) {
            console.error(getInvalidR2ActionMessage());
            process.exit(1);
        }
        await manageR2Bucket(action as 'list' | 'create' | 'delete', bucketName);
    });

/**
 * logsコマンド：Cloudflare Workerのログをリアルタイムで監視
 * フィルタリング機能付きでログの絞り込みが可能
 */
program
    .command('logs [worker-name]')
    .description('Workerログをリアルタイムで監視')
    .option('--format <format>', '出力形式（jsonまたはpretty）', 'pretty')
    .option('--status <status>', 'ステータスでフィルタリング（okまたはerror）')
    .option('--method <method>', 'HTTPメソッドでフィルタリング')
    .option('--search <term>', '特定の用語でログを検索')
    .action(async (workerName, options) => {
        const { tailWorkerLogs } = await import('./commands/dashboard.js');
        await tailWorkerLogs(workerName, {
            format: options.format as 'json' | 'pretty',
            status: options.status as 'ok' | 'error' | undefined,
            method: options.method,
            search: options.search,
        });
    });

/**
 * ipcコマンド：プロセス間通信（IPC）サーバーの起動
 * TCP/IPまたはUnixソケット経由での通信をサポート
 */
program
    .command('ipc')
    .description('プロセス間通信用のIPCサーバーを起動')
    .option('-p, --port <port>', 'リスンするポート', '9123')
    .option('-s, --socket <path>', 'Unixソケットパス')
    .option('-d, --daemon', 'デーモンとして実行')
    .option('-v, --verbose', '詳細出力')
    .option('-t, --token <token>', 'Authentication token')
    .action(async (options) => {
        const { startIPC } = await import('./commands/ipc.js');
        await startIPC({
            port: options.port ? Number.parseInt(options.port) : undefined,
            socketPath: options.socket,
            daemon: options.daemon,
            verbose: options.verbose,
            authToken: options.token,
        });
    });

/**
 * ipc-testコマンド：IPCサーバーへの接続テスト
 * サーバーの動作確認とトラブルシューティング用
 */
program
    .command('ipc-test')
    .description('IPCサーバーへの接続テスト')
    .option('-p, --port <port>', '接続先ポート', '9123')
    .option('-s, --socket <path>', 'Unixソケットパス')
    .option('-h, --host <host>', '接続先ホスト', '127.0.0.1')
    .option('-t, --token <token>', 'Authentication token')
    .action(async (options) => {
        const { testIPC } = await import('./commands/ipc.js');
        await testIPC({
            port: options.port ? Number.parseInt(options.port) : undefined,
            socketPath: options.socket,
            host: options.host,
            authToken: options.token,
        });
    });

/**
 * tuiコマンド：ターミナルUIダッシュボードの起動（廃止予定）
 * 後方互換性のため維持。新しいコマンド 'dashboard cloudflare' の使用を推奨
 */
program
    .command('tui')
    .description(
        '[非推奨] "dashboard cloudflare"を使用してください - Cloudflare Workers用のインタラクティブTUIダッシュボードを起動'
    )
    .option('-p, --port <port>', '接続先のIPCサーバーポート', '9123')
    .option('-h, --host <host>', '接続先のIPCサーバーホスト', '127.0.0.1')
    .option('-t, --token <token>', 'IPCサーバー用の認証トークン')
    .option('-r, --refresh <interval>', 'リフレッシュ間隔（ミリ秒）', '5000')
    .option('--theme <theme>', 'カラーテーマ（darkまたはlight）', 'dark')
    .action(async (options) => {
        // 非推奨警告を表示
        console.log(chalk.yellow('⚠️  警告: "tui"コマンドは非推奨です'));
        console.log(
            chalk.yellow('🔄 代わりに以下を使用してください: fluorite-flake dashboard cloudflare')
        );
        console.log(chalk.gray('   このコマンドは将来のバージョンで削除されます\n'));

        // 新しいダッシュボードコマンドにリダイレクト
        const { launchServiceDashboard } = await import('./commands/multi-dashboard.js');
        await launchServiceDashboard('cloudflare', {
            mode: 'tui',
            host: options.host,
            port: options.port ? Number.parseInt(options.port) : undefined,
            token: options.token,
            refresh: options.refresh ? Number.parseInt(options.refresh) : undefined,
            theme: options.theme as 'dark' | 'light',
        });
    });

/**
 * コマンドライン引数の解析処理
 * pnpmが追加する '--' セパレータを考慮した引数の前処理
 */
const sanitizedUserArgs = process.argv.slice(2).filter((arg) => arg !== '--');

// 引数なしで実行された場合はヘルプを表示して終了
if (sanitizedUserArgs.length === 0) {
    program.outputHelp();
    process.exit(0);
}

// 引数配列をコピーしてCommanderに渡す準備
const argvToParse = [...process.argv];
// pnpmの '--' セパレータを削除（Commanderが正しくフラグを認識できるように）
const separatorIndex = argvToParse.indexOf('--');
if (separatorIndex !== -1) {
    argvToParse.splice(separatorIndex, 1);
}

// Commanderによるコマンドライン引数の解析と実行
program.parse(argvToParse);
