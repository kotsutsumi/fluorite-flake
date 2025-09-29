/**
 * Cloudflare R2バケット管理機能
 *
 * Cloudflare R2ストレージのバケット管理（作成、削除、一覧表示）を
 * 提供します。安全な操作実行のために認証確認、エラーハンドリング、
 * ユーザーフィードバック機能を備えています。
 *
 * @module manageR2Bucket
 */

import chalk from 'chalk';
import ora from 'ora';
import { createWranglerDashboard } from '../../utils/wrangler-dashboard.js';

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
