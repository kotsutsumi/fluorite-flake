/**
 * Dashboard command for viewing Cloudflare Workers and R2 status
 */

import chalk from 'chalk';
import ora from 'ora';
import { createWranglerDashboard, formatDashboardData } from '../utils/wrangler-dashboard.js';

/**
 * Display Cloudflare dashboard information
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
        // Check if Wrangler is available
        const isAvailable = await dashboard.isAvailable();
        if (!isAvailable) {
            spinner.fail('Wrangler CLI is not installed or not in PATH');
            console.log(chalk.yellow('\nTo install Wrangler:'));
            console.log(chalk.cyan('  npm install -g wrangler'));
            console.log(chalk.cyan('  # or'));
            console.log(chalk.cyan('  pnpm add -g wrangler'));
            return;
        }

        // Check authentication
        spinner.text = 'Checking authentication status...';
        const isAuth = await dashboard.isAuthenticated();
        if (!isAuth) {
            spinner.warn('Not authenticated with Cloudflare');
            console.log(chalk.yellow('\nTo authenticate:'));
            console.log(chalk.cyan('  wrangler login'));
            return;
        }

        // Get user info
        const userInfo = await dashboard.whoami();
        spinner.succeed(`Authenticated as: ${userInfo?.email || 'Unknown'}`);

        // Get dashboard data based on options
        const showAll = !options.workers && !options.r2 && !options.kv && !options.analytics;

        if (showAll || options.workers || options.r2 || options.kv) {
            const dataSpinner = ora('Fetching dashboard data...').start();

            try {
                const data = await dashboard.getDashboardData();

                // Filter data based on options
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
                    // Output as JSON
                    console.log(JSON.stringify(data, null, 2));
                } else {
                    // Format and display
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

        // Get analytics if requested
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
 * Deploy a worker
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
        // Check if Wrangler is available
        const isAvailable = await dashboard.isAvailable();
        if (!isAvailable) {
            spinner.fail('Wrangler CLI is not installed');
            return;
        }

        // Check authentication
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
 * Manage R2 buckets
 */
export async function manageR2Bucket(action: 'create' | 'delete' | 'list', bucketName?: string) {
    const dashboard = createWranglerDashboard();
    const spinner = ora('Checking Wrangler CLI...').start();

    try {
        // Check if Wrangler is available
        const isAvailable = await dashboard.isAvailable();
        if (!isAvailable) {
            spinner.fail('Wrangler CLI is not installed');
            return;
        }

        // Check authentication
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
 * Tail worker logs
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
        // Check if Wrangler is available
        const isAvailable = await dashboard.isAvailable();
        if (!isAvailable) {
            spinner.fail('Wrangler CLI is not installed');
            return;
        }

        // Check authentication
        const isAuth = await dashboard.isAuthenticated();
        if (!isAuth) {
            spinner.fail('Not authenticated with Cloudflare');
            return;
        }

        spinner.succeed('Tailing worker logs (press Ctrl+C to stop)...');
        console.log(chalk.gray('─'.repeat(50)));

        // Start tailing logs
        const logStream = await dashboard.tailLogs(workerName, options);

        for await (const log of logStream) {
            // Format log based on content
            if (options.format === 'json') {
                console.log(log);
            } else {
                // Pretty format with colors
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
