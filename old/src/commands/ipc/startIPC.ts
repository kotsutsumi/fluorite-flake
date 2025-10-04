/**
 * IPCサーバー起動機能
 *
 * Fluorite Flake CLIのIPCサーバーを起動し、外部プロセス（GUI、TUI、
 * Tauriアプリケーション）からCLI機能にアクセスできるようにします。
 * フォアグラウンドまたはデーモンモードでの起動をサポートします。
 *
 * @module startIPC
 */

import chalk from 'chalk';
import ora from 'ora';
import { setupIPCServer, startIPCDaemon } from '../../ipc/ipc-integration.js';

/**
 * IPCサーバーデーモンの起動
 *
 * 指定されたオプションでIPCサーバーを起動します。
 * デーモンモードではバックグラウンドで実行され、
 * フォアグラウンドモードではインタラクティブな状態表示を行います。
 *
 * @param options - IPCサーバーの起動オプション
 * @param options.port - TCPポート番号（デフォルト: 9123）
 * @param options.socketPath - UNIXソケットパス
 * @param options.daemon - デーモンモードで起動するか
 * @param options.verbose - 詳細なログ出力を有効にするか
 * @param options.authToken - クライアント認証用トークン
 *
 * @example
 * ```typescript
 * // フォアグラウンドで起動
 * await startIPC({ port: 9123, verbose: true });
 *
 * // デーモンで起動
 * await startIPC({ daemon: true, authToken: 'secret' });
 * ```
 */
export async function startIPC(options: {
    port?: number;
    socketPath?: string;
    daemon?: boolean;
    verbose?: boolean;
    authToken?: string;
}) {
    if (options.daemon) {
        // デーモンとして起動
        await startIPCDaemon({
            port: options.port,
            socketPath: options.socketPath,
            authToken: options.authToken,
            verbose: options.verbose,
        });
    } else {
        // フォアグラウンドで起動
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

            // シャットダウンハンドリング
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
