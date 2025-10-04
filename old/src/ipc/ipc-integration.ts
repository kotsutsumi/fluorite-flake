/**
 * IPC統合モジュール
 *
 * IPCサーバーと既存のCLI機能を結びつけるモジュールです。
 * Cloudflare Workers管理、プロジェクト作成、システム操作などの
 * CLI機能をIPC経由で利用できるようにします。
 *
 * @module IPCIntegration
 */

import { createIPCServer, type IPCServer } from './ipc-server.js';
import { createWranglerDashboard } from '../utils/wrangler-dashboard.js';
import { createProject } from '../commands/create/index.js';
import type { ProjectConfig } from '../commands/create/types.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * すべてのメソッドハンドラを設定したIPCサーバーのセットアップ
 *
 * IPCサーバーを作成し、Fluorite Flake CLIのすべての機能にアクセスできる
 * メソッドハンドラを登録します。ダッシュボード操作、プロジェクト作成、
 * システム管理などの機能を外部プロセスから利用できます。
 *
 * @param options - IPCサーバーの設定オプション
 * @param options.port - TCPポート番号
 * @param options.socketPath - UNIXソケットパス
 * @param options.authToken - 認証トークン
 * @returns IPCServer 設定済みのIPCサーバーインスタンス
 *
 * @example
 * ```typescript
 * const server = setupIPCServer({ port: 9123, authToken: 'token' });
 * await server.start();
 * ```
 */
export function setupIPCServer(options?: {
    port?: number;
    socketPath?: string;
    authToken?: string;
}): IPCServer {
    const server = createIPCServer(options);
    const dashboard = createWranglerDashboard();

    // ダッシュボードメソッドの登録
    server.registerMethod('dashboard.getData', async () => {
        return await dashboard.getDashboardData();
    });

    server.registerMethod('dashboard.deployWorker', async (params) => {
        return await dashboard.deployWorker({
            name: params?.name,
            env: params?.env,
            dryRun: params?.dryRun,
        });
    });

    server.registerMethod('dashboard.listR2Buckets', async () => {
        return await dashboard.listR2Buckets();
    });

    server.registerMethod('dashboard.createR2Bucket', async (params) => {
        if (!params?.name) {
            throw new Error('Bucket name is required');
        }
        return await dashboard.createR2Bucket(params.name);
    });

    server.registerMethod('dashboard.deleteR2Bucket', async (params) => {
        if (!params?.name) {
            throw new Error('Bucket name is required');
        }
        return await dashboard.deleteR2Bucket(params.name);
    });

    // Workerログのリアルタイムストリーミングメソッド
    server.registerMethod('dashboard.tailLogs', async function* (params) {
        const logStream = await dashboard.tailLogs(params?.workerName, {
            format: params?.format,
        });

        // ログストリームを順次クライアントに送信
        for await (const log of logStream) {
            yield log;
        }
    });

    // プロジェクト作成メソッドの登録
    server.registerMethod('project.create', async (params) => {
        if (!params?.framework || !params?.name || !params?.path) {
            throw new Error('Framework, name, and path are required');
        }

        // プロジェクト設定の構築
        const config: ProjectConfig = {
            framework: params.framework as ProjectConfig['framework'],
            projectName: params.name,
            projectPath: params.path,
            database: (params.database || 'none') as ProjectConfig['database'],
            orm: params.orm as ProjectConfig['orm'],
            storage: (params.storage || 'none') as ProjectConfig['storage'],
            auth: params.auth ?? false,
            deployment: params.deployment ?? false,
            packageManager: (params.packageManager || 'npm') as ProjectConfig['packageManager'],
            mode: 'full',
        };

        try {
            await createProject(config);
            return { success: true, projectPath: config.projectPath };
        } catch (error) {
            throw new Error(`Project creation failed: ${(error as Error).message}`);
        }
    });

    // システムメソッドの登録
    // サーバーの稼働状態確認用のpingメソッド
    server.registerMethod('system.ping', async () => {
        return { pong: true, timestamp: Date.now() };
    });

    // システムバージョン情報取得メソッド
    server.registerMethod('system.version', async () => {
        const packageJson = JSON.parse(
            readFileSync(join(__dirname, '../../package.json'), 'utf-8')
        );
        return {
            version: packageJson.version,
            node: process.version,
        };
    });

    // サーバーシャットダウンメソッド
    server.registerMethod('system.shutdown', async () => {
        // 100ms後にサーバーを停止してプロセスを終了
        setTimeout(() => {
            server.stop();
            process.exit(0);
        }, 100);
        return { success: true };
    });

    return server;
}

/**
 * IPCサーバーをデーモンとして起動
 *
 * IPCサーバーをバックグラウンドプロセスとして起動します。
 * シグナルハンドリング、ログ出力、エラーハンドリングを設定し、
 * 外部プロセスからの接続を待受けします。
 *
 * @param options - デーモン起動の設定オプション
 * @param options.port - TCPポート番号
 * @param options.socketPath - UNIXソケットパス
 * @param options.authToken - 認証トークン
 * @param options.verbose - 詳細なログ出力を有効にするか
 * @returns Promise<void> サーバーが起動したら解決されるPromise
 *
 * @example
 * ```typescript
 * await startIPCDaemon({ port: 9123, verbose: true });
 * ```
 */
export async function startIPCDaemon(options?: {
    port?: number;
    socketPath?: string;
    authToken?: string;
    verbose?: boolean;
}): Promise<void> {
    const server = setupIPCServer(options);

    // サーバー起動完了時の処理
    server.on('listening', (info) => {
        if (options?.verbose) {
            console.log('IPC Server listening:', info);
        }
        // クライアント用に接続情報を標準出力に出力
        console.log(
            JSON.stringify({
                type: 'ipc-server-ready',
                ...info,
            })
        );
    });

    // クライアント接続イベントのハンドリング
    server.on('connection', () => {
        if (options?.verbose) {
            console.log('Client connected');
        }
    });

    // クライアント切断イベントのハンドリング
    server.on('disconnection', () => {
        if (options?.verbose) {
            console.log('Client disconnected');
        }
    });

    server.on('error', (error) => {
        console.error('IPC Server error:', error);
    });

    try {
        await server.start();

        // シャットダウンシグナルのハンドリング
        // Ctrl+C（SIGINT）での終了処理
        process.on('SIGINT', async () => {
            await server.stop();
            process.exit(0);
        });

        // システム終了シグナル（SIGTERM）での終了処理
        process.on('SIGTERM', async () => {
            await server.stop();
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to start IPC server:', error);
        process.exit(1);
    }
}
