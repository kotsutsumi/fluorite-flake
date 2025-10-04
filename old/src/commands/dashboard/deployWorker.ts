/**
 * Cloudflare Workerデプロイ機能
 *
 * Cloudflare WorkersのデプロイメントとValidator機能を提供します。
 * ドライランモード、環境指定、認証確認など、安全なデプロイメント
 * 実行のための機能を備えています。
 *
 * @module deployWorker
 */

import chalk from 'chalk';
import ora from 'ora';
import { createWranglerDashboard } from '../../utils/wrangler-dashboard.js';

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
