/**
 * Cloudflare Workers監視用TUIダッシュボードコマンド
 *
 * ターミナルユーザーインターフェース（TUI）を使用したインタラクティブな
 * Cloudflare Workersダッシュボードを提供します。リアルタイムのメトリクス、
 * ログ監視、リソース管理などの機能を統合したダッシュボードです。
 *
 * @module TUIDashboardCommand
 */

import chalk from 'chalk';
import ora from 'ora';
import { startTUIDashboard } from '../tui/dashboard.js';

/**
 * TUIダッシュボードのオプション設定
 *
 * @interface TUIDashboardOptions
 */
export interface TUIDashboardOptions {
    /** IPCサーバーのTCPポート番号（デフォルト: 9123） */
    port?: number;
    /** IPCサーバーのホスト名（デフォルト: 127.0.0.1） */
    host?: string;
    /** IPCサーバーの認証トークン */
    token?: string;
    /** ダッシュボードの更新間隔（ミリ秒、デフォルト: 5000） */
    refreshInterval?: number;
    /** UIテーマ（'dark' | 'light'、デフォルト: 'dark'） */
    theme?: 'dark' | 'light';
}

/**
 * TUIダッシュボードの起動
 *
 * インタラクティブなTUIダッシュボードを起動し、Cloudflare Workersの
 * リアルタイム監視を開始します。IPCサーバーと接続してデータを取得し、
 * ターミナル上で美しいダッシュボードを表示します。
 * キーボード操作、マウスサポート、カスタマイズ可能なテーマを提供します。
 *
 * @param options - TUIダッシュボードの起動オプション
 * @returns Promise<void> ダッシュボードが終了したら解決されるPromise
 *
 * @example
 * ```typescript
 * // デフォルト設定で起動
 * await startTUI();
 *
 * // カスタム設定で起動
 * await startTUI({
 *   port: 9123,
 *   host: '127.0.0.1',
 *   refreshInterval: 3000,
 *   theme: 'light'
 * });
 *
 * // 認証付きで起動
 * await startTUI({ token: 'my-secret-token' });
 * ```
 */
export async function startTUI(options: TUIDashboardOptions = {}): Promise<void> {
    const spinner = ora('Starting TUI Dashboard...').start();

    try {
        // 提供されたオプションでダッシュボードを起動
        await startTUIDashboard({
            refreshInterval: options.refreshInterval || 5000,
            ipcPort: options.port || 9123,
            ipcHost: options.host || '127.0.0.1',
            ipcToken: options.token,
            theme: options.theme || 'dark',
        });

        spinner.stop();

        // ダッシュボードが起動中 - 制御はTUIに移行
        // TUIが独自の終了処理を管理する
    } catch (error) {
        spinner.fail('Failed to start TUI Dashboard');
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
    }
}
