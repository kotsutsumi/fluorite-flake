/**
 * Cloudflare WorkersとR2の状態表示用ダッシュボードコマンド
 *
 * Cloudflareのリソース（Workers、R2バケット、KVストア）の状態を表示し、
 * 管理操作（デプロイ、バケット作成・削除、ログ監視）を提供します。
 * Wrangler CLIを使用してCloudflare APIと連携し、リアルタイムの情報を取得します。
 *
 * @module DashboardCommand
 */

import chalk from 'chalk';
import ora from 'ora';
import { createWranglerDashboard, formatDashboardData } from '../utils/wrangler-dashboard.js';

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

/**
 * Workerのデプロイ
 *
 * 指定されたWorkerをCloudflareにデプロイします。
 * ドライランモードでのテスト、環境指定、デプロイ結果のフィードバックを提供します。
 * Wrangler CLIを使用して実際のデプロイ作業を実行します。
 *
 * @param name - デプロイするWorker名（オプション）
 * @param options - デプロイオプション
 * @param options.env - デプロイ環境名
 * @param options.dryRun - ドライランモード（実際のデプロイは実行しない）
 *
 * @example
 * ```typescript
 * // ドライランでテスト
 * await deployWorker('my-worker', { dryRun: true });
 *
 * // 本番環境にデプロイ
 * await deployWorker('my-worker', { env: 'production' });
 * ```
 */
export async function deployWorker(
    name?: string,
    options: {
        env?: string;
        dryRun?: boolean;
    } = {}
) {
    const dashboard = createWranglerDashboard();
    const spinner = ora('Preparing deployment...').start();

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
            console.log(chalk.yellow('Run: wrangler login'));
            return;
        }

        spinner.text =
            options.dryRun !== false ? 'Running deployment (dry run)...' : 'Deploying worker...';

        const result = await dashboard.deployWorker({
            name,
            env: options.env,
            dryRun: options.dryRun,
        });

        if (result.success) {
            spinner.succeed(
                options.dryRun !== false
                    ? 'Deployment validated (dry run)'
                    : 'Worker deployed successfully'
            );
            console.log(chalk.gray(result.message));
        } else {
            spinner.fail('Deployment failed');
            console.error(chalk.red(result.message));
        }
    } catch (error) {
        spinner.fail('An error occurred during deployment');
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
}

/**
 * R2バケットの管理
 *
 * Cloudflare R2バケットの作成、削除、一覧表示を行います。
 * Wrangler CLIを使用してR2 APIと連携し、バケットのライフサイクル管理を
 * 安全かつ確実に実行します。操作結果のフィードバックも提供します。
 *
 * @param action - 実行する操作（'create' | 'delete' | 'list'）
 * @param bucketName - 操作対象のバケット名（create/delete時に必須）
 *
 * @example
 * ```typescript
 * // バケット一覧の表示
 * await manageR2Bucket('list');
 *
 * // 新しいバケットの作成
 * await manageR2Bucket('create', 'my-bucket');
 *
 * // バケットの削除
 * await manageR2Bucket('delete', 'old-bucket');
 * ```
 */
export async function manageR2Bucket(action: 'create' | 'delete' | 'list', bucketName?: string) {
    const dashboard = createWranglerDashboard();
    const spinner = ora('Checking Wrangler CLI...').start();

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

        switch (action) {
            case 'list': {
                spinner.text = 'Fetching R2 buckets...';
                const buckets = await dashboard.listR2Buckets();
                spinner.succeed(`Found ${buckets.length} R2 bucket(s)`);

                if (buckets.length > 0) {
                    console.log(`\n${chalk.bold.cyan('R2 Buckets:')}`);
                    for (const bucket of buckets) {
                        console.log(
                            `  🪣 ${bucket.name}${bucket.location ? ` (${bucket.location})` : ''}`
                        );
                    }
                } else {
                    console.log(chalk.gray('No R2 buckets found'));
                }
                break;
            }

            case 'create': {
                if (!bucketName) {
                    spinner.fail('Bucket name is required');
                    return;
                }

                spinner.text = `Creating R2 bucket: ${bucketName}...`;
                const result = await dashboard.createR2Bucket(bucketName);

                if (result.success) {
                    spinner.succeed(`R2 bucket '${bucketName}' created successfully`);
                    console.log(chalk.gray(result.message));
                } else {
                    spinner.fail('Failed to create R2 bucket');
                    console.error(chalk.red(result.message));
                }
                break;
            }

            case 'delete': {
                if (!bucketName) {
                    spinner.fail('Bucket name is required');
                    return;
                }

                spinner.text = `Deleting R2 bucket: ${bucketName}...`;
                const result = await dashboard.deleteR2Bucket(bucketName);

                if (result.success) {
                    spinner.succeed(`R2 bucket '${bucketName}' deleted successfully`);
                    console.log(chalk.gray(result.message));
                } else {
                    spinner.fail('Failed to delete R2 bucket');
                    console.error(chalk.red(result.message));
                }
                break;
            }
        }
    } catch (error) {
        spinner.fail('An error occurred');
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
}

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
