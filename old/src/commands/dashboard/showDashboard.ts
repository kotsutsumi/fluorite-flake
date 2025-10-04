/**
 * Cloudflareダッシュボード表示機能
 *
 * Cloudflareアカウントのリソース情報（Workers、R2バケット、KVネームスペース）を
 * 取得して整理された形で表示します。認証状態の確認からデータ取得、
 * フォーマット出力まで一連の処理を実行します。
 *
 * @module showDashboard
 */

import chalk from 'chalk';
import ora from 'ora';
import { createWranglerDashboard, formatDashboardData } from '../../utils/wrangler-dashboard.js';

/**
 * Cloudflareダッシュボード情報の表示
 *
 * Cloudflareアカウントのリソース情報を取得し、整理された形で表示します。
 * Workers、R2バケット、KVネームスペースの情報を個別または統合して表示できます。
 * Wrangler CLIのインストールと認証状態を事前に確認します。
 *
 * @param options - 表示オプションの設定
 * @param options.json - JSON形式で出力するか
 * @param options.workers - Workers情報のみ表示するか
 * @param options.r2 - R2バケット情報のみ表示するか
 * @param options.kv - KVネームスペース情報のみ表示するか
 * @param options.analytics - アナリティクス情報を表示するか
 * @param options.workerName - アナリティクスを取得するWorker名
 *
 * @example
 * ```typescript
 * // 全リソースの表示
 * await showDashboard();
 *
 * // WorkersのみをJSONで出力
 * await showDashboard({ workers: true, json: true });
 *
 * // 特定Workerのアナリティクス表示
 * await showDashboard({ analytics: true, workerName: 'my-worker' });
 * ```
 */
export async function showDashboard(
    options: {
        json?: boolean;
        workers?: boolean;
        r2?: boolean;
        kv?: boolean;
        analytics?: boolean;
        workerName?: string;
    } = {}
) {
    const spinner = ora('Checking Wrangler CLI availability...').start();
    const dashboard = createWranglerDashboard();

    try {
        // Wrangler CLIの利用可能性を確認
        const isAvailable = await dashboard.isAvailable();
        if (!isAvailable) {
            spinner.fail('Wrangler CLI is not installed or not in PATH');
            console.log(chalk.yellow('\nTo install Wrangler:'));
            console.log(chalk.cyan('  npm install -g wrangler'));
            console.log(chalk.cyan('  # or'));
            console.log(chalk.cyan('  pnpm add -g wrangler'));
            return;
        }

        // 認証状態の確認
        spinner.text = 'Checking authentication status...';
        const isAuth = await dashboard.isAuthenticated();
        if (!isAuth) {
            spinner.warn('Not authenticated with Cloudflare');
            console.log(chalk.yellow('\nTo authenticate:'));
            console.log(chalk.cyan('  wrangler login'));
            return;
        }

        // ユーザー情報の取得
        const userInfo = await dashboard.whoami();
        spinner.succeed(`Authenticated as: ${userInfo?.email || 'Unknown'}`);

        // オプションに基づいてダッシュボードデータを取得
        const showAll = !options.workers && !options.r2 && !options.kv && !options.analytics;

        if (showAll || options.workers || options.r2 || options.kv) {
            const dataSpinner = ora('Fetching dashboard data...').start();

            try {
                const data = await dashboard.getDashboardData();

                // オプションに基づいてデータをフィルタリング
                if (!showAll) {
                    if (!options.workers) {
                        data.workers = [];
                    }
                    if (!options.r2) {
                        data.r2Buckets = [];
                    }
                    if (!options.kv) {
                        data.kvNamespaces = [];
                    }
                }

                dataSpinner.succeed('Dashboard data fetched');

                if (options.json) {
                    // JSON形式で出力
                    console.log(JSON.stringify(data, null, 2));
                } else {
                    // 整形して表示
                    console.log(`\n${chalk.bold.blue('Cloudflare Dashboard')}`);
                    console.log(chalk.gray('─'.repeat(50)));

                    const formatted = formatDashboardData(data);
                    if (formatted) {
                        console.log(formatted);
                    } else {
                        console.log(chalk.gray('No resources found'));
                    }
                }
            } catch (error) {
                dataSpinner.fail('Failed to fetch dashboard data');
                console.error(chalk.red(error instanceof Error ? error.message : String(error)));
            }
        }

        // リクエストされた場合はアナリティクスを取得
        if (options.analytics && options.workerName) {
            const analyticsSpinner = ora(`Fetching analytics for ${options.workerName}...`).start();

            try {
                const analytics = await dashboard.getAnalytics(options.workerName);

                if (analytics) {
                    analyticsSpinner.succeed('Analytics fetched');

                    if (options.json) {
                        console.log(JSON.stringify(analytics, null, 2));
                    } else {
                        console.log(`\n${chalk.bold.yellow('Worker Analytics')}`);
                        console.log(chalk.gray('─'.repeat(50)));
                        console.log(`📊 Requests: ${analytics.requests.total} total`);
                        console.log(`   ✅ Success: ${analytics.requests.success}`);
                        console.log(`   ❌ Errors: ${analytics.requests.error}`);
                        console.log(
                            `📡 Bandwidth: ${(analytics.bandwidth.bytes / 1024).toFixed(2)} KB`
                        );
                        console.log(
                            `⚡ CPU Time (p50/p75/p99): ${analytics.cpu_time.percentiles.p50}/${analytics.cpu_time.percentiles.p75}/${analytics.cpu_time.percentiles.p99} ms`
                        );
                    }
                } else {
                    analyticsSpinner.warn('No analytics data available');
                    console.log(chalk.gray('Analytics may require a paid Cloudflare plan'));
                }
            } catch (error) {
                analyticsSpinner.fail('Failed to fetch analytics');
                console.error(chalk.red(error instanceof Error ? error.message : String(error)));
            }
        }
    } catch (error) {
        spinner.fail('An error occurred');
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
}
