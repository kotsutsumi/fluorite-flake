/**
 * Cloudflare Workerログ監視機能
 *
 * Cloudflare Workersのリアルタイムログ監視とストリーミング表示を
 * 提供します。ログフィルタリング、カラー出力、フォーマット選択など
 * デバッグと監視に役立つ機能を備えています。
 *
 * @module tailWorkerLogs
 */

import chalk from 'chalk';
import ora from 'ora';
import { createWranglerDashboard } from '../../utils/wrangler-dashboard.js';

/**
 * Workerログのリアルタイム監視
 *
 * 指定されたWorkerのログをリアルタイムでストリーミングし、
 * コンソールに表示します。ログのフォーマット、フィルタリング、
 * カラー出力などのオプションを提供し、デバッグと監視を支援します。
 *
 * @param workerName - 監視するWorker名（オプション）
 * @param options - ログ監視のオプション
 * @param options.format - ログの出力フォーマット（'json' | 'pretty'）
 * @param options.status - ステータスコードでフィルタリング（'ok' | 'error'）
 * @param options.method - HTTPメソッドでフィルタリング
 * @param options.search - ログ内容の検索キーワード
 *
 * @example
 * ```typescript
 * // 全Workerのログを綺麗なフォーマットで表示
 * await tailWorkerLogs(undefined, { format: 'pretty' });
 *
 * // 特定Workerのエラーログのみ表示
 * await tailWorkerLogs('my-worker', { status: 'error' });
 *
 * // JSONフォーマットで出力
 * await tailWorkerLogs('api-worker', { format: 'json' });
 * ```
 */
export async function tailWorkerLogs(
    workerName?: string,
    options: {
        format?: 'json' | 'pretty';
        status?: 'ok' | 'error';
        method?: string;
        search?: string;
    } = {}
) {
    const dashboard = createWranglerDashboard();
    const spinner = ora('Starting log tail...').start();

    try {
        // Wranglerが利用可能か確認
        const isAvailable = await dashboard.isAvailable();
        if (!isAvailable) {
            spinner.fail('Wrangler CLI is not installed');
            return;
        }

        // 認証状態を確認
        const isAuth = await dashboard.isAuthenticated();
        if (!isAuth) {
            spinner.fail('Not authenticated with Cloudflare');
            return;
        }

        spinner.succeed('Tailing worker logs (press Ctrl+C to stop)...');
        console.log(chalk.gray('─'.repeat(50)));

        // ログのテーリングを開始
        const logStream = await dashboard.tailLogs(workerName, options);

        for await (const log of logStream) {
            // 内容に基づいてログをフォーマット
            if (options.format === 'json') {
                console.log(log);
            } else {
                // カラーで綺麗にフォーマット
                if (log.includes('error') || log.includes('Error')) {
                    console.log(chalk.red(log));
                } else if (log.includes('warning') || log.includes('Warning')) {
                    console.log(chalk.yellow(log));
                } else if (log.includes('success') || log.includes('200')) {
                    console.log(chalk.green(log));
                } else {
                    console.log(log);
                }
            }
        }
    } catch (error) {
        spinner.fail('Failed to tail logs');
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
}
