/**
 * IPC接続テスト機能
 *
 * 指定されたIPCサーバーに接続し、基本的な機能をテストします。
 * pingテスト、バージョン情報取得、ダッシュボードデータ取得を実行し、
 * サーバーの動作状態を確認します。
 *
 * @module testIPC
 */

import chalk from 'chalk';
import ora from 'ora';
import { createIPCClient } from '../../ipc/ipc-client.js';

/**
 * IPC接続のテスト
 *
 * 指定されたIPCサーバーに接続し、基本的な機能をテストします。
 * pingテスト、バージョン情報取得、ダッシュボードデータ取得を実行し、
 * サーバーの動作状態を確認します。
 *
 * @param options - テスト用の接続オプション
 * @param options.port - TCPポート番号（デフォルト: 9123）
 * @param options.socketPath - UNIXソケットパス
 * @param options.host - ホスト名またはIPアドレス
 * @param options.authToken - 認証トークン
 *
 * @example
 * ```typescript
 * // ローカルサーバーのテスト
 * await testIPC({ port: 9123 });
 *
 * // 認証付きテスト
 * await testIPC({ port: 9123, authToken: 'token' });
 * ```
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

        // pingテストの実行
        const pingSpinner = ora('Testing ping...').start();
        const pingResult = await client.call('system.ping');
        pingSpinner.succeed(`Ping successful: ${JSON.stringify(pingResult)}`);

        // バージョン情報の取得
        const versionSpinner = ora('Getting version...').start();
        const versionResult = await client.call('system.version');
        versionSpinner.succeed(`Version: ${versionResult.version} (Node ${versionResult.node})`);

        // ダッシュボードデータの取得テスト
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
