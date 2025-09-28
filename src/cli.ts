#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

import { createProject } from './commands/create/index.js';
import type { ProjectConfig } from './commands/create/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

// Configure the CLI
program
    .name('fluorite-flake')
    .description('Multi-framework project generator')
    .version(packageJson.version);

// Add create command for Next.js boilerplate generator
program
    .command('create')
    .alias('new')
    .description('Create a new project with interactive options (Next.js, Expo, Tauri, Flutter)')
    .option('--name <name>', 'Project name')
    .option('--path <path>', 'Project path')
    .option('--framework <framework>', 'Framework (nextjs, expo, tauri, flutter)')
    .option('--database <database>', 'Database (none, turso, supabase)')
    .option('--orm <orm>', 'ORM (prisma, drizzle)')
    .option(
        '--storage <storage>',
        'Storage (none, vercel-blob, cloudflare-r2, aws-s3, supabase-storage)'
    )
    .option('--no-deployment', 'Skip deployment configuration')
    .option('--no-auth', 'Skip authentication setup')
    .option('--package-manager <manager>', 'Package manager (npm, pnpm, yarn, bun)')
    .option('--mode <mode>', 'Mode (full, test)')
    .action(async (options) => {
        const config: Partial<ProjectConfig> = {};

        // Map CLI options to config if provided
        if (options.name) {
            config.projectName = options.name;
        }
        if (options.path) {
            config.projectPath = options.path;
        }
        if (options.framework) {
            if (['nextjs', 'expo', 'tauri', 'flutter'].includes(options.framework)) {
                config.framework = options.framework as ProjectConfig['framework'];
            } else {
                console.error(`Invalid framework: ${options.framework}`);
                process.exit(1);
            }
        }
        if (options.database) {
            if (['none', 'turso', 'supabase'].includes(options.database)) {
                config.database = options.database as ProjectConfig['database'];
            } else {
                console.error(`Invalid database: ${options.database}`);
                process.exit(1);
            }
        }
        if (options.orm) {
            if (['prisma', 'drizzle'].includes(options.orm)) {
                config.orm = options.orm as ProjectConfig['orm'];
            } else {
                console.error(`Invalid ORM: ${options.orm}`);
                process.exit(1);
            }
        }
        if (options.storage) {
            if (
                ['none', 'vercel-blob', 'cloudflare-r2', 'aws-s3', 'supabase-storage'].includes(
                    options.storage
                )
            ) {
                config.storage = options.storage as ProjectConfig['storage'];
            } else {
                console.error(`Invalid storage: ${options.storage}`);
                process.exit(1);
            }
        }
        if (options.deployment !== undefined) {
            config.deployment = options.deployment;
        }
        if (options.auth !== undefined) {
            config.auth = options.auth;
        }
        if (options.packageManager) {
            if (['npm', 'pnpm', 'yarn', 'bun'].includes(options.packageManager)) {
                config.packageManager = options.packageManager as ProjectConfig['packageManager'];
            } else {
                console.error(`Invalid package manager: ${options.packageManager}`);
                process.exit(1);
            }
        }
        if (options.mode) {
            if (['full', 'minimal', 'test'].includes(options.mode)) {
                config.mode =
                    options.mode === 'test' ? 'minimal' : (options.mode as ProjectConfig['mode']);
            } else {
                console.error(`Invalid mode: ${options.mode}`);
                process.exit(1);
            }
        }

        // If any CLI arguments were provided, validate that minimum required ones are present
        const hasCliArgs = Object.keys(options).some(
            (key) => key !== 'deployment' && key !== 'auth' && options[key] !== undefined
        );
        if (hasCliArgs) {
            // Check if minimum required arguments are present for CLI mode
            if (
                !options.name ||
                !options.framework ||
                !options.path ||
                options.database === undefined ||
                options.storage === undefined ||
                options.packageManager === undefined
            ) {
                console.error(
                    'When using CLI arguments, --name, --path, --framework, --database, --storage, and --package-manager are required'
                );
                process.exit(1);
            }
            // If database is specified and not none, orm is required
            if (options.database && options.database !== 'none' && !options.orm) {
                console.error('When database is not "none", --orm is required');
                process.exit(1);
            }
        }

        await createProject(config);
    });

// Add dashboard command for Cloudflare Workers management
program
    .command('dashboard')
    .description('View and manage Cloudflare Workers dashboard')
    .option('--json', 'Output as JSON')
    .option('--workers', 'Show only workers')
    .option('--r2', 'Show only R2 buckets')
    .option('--kv', 'Show only KV namespaces')
    .option('--analytics <worker>', 'Show analytics for a specific worker')
    .action(async (options) => {
        const { showDashboard } = await import('./commands/dashboard.js');
        await showDashboard({
            json: options.json,
            workers: options.workers,
            r2: options.r2,
            kv: options.kv,
            analytics: !!options.analytics,
            workerName: options.analytics,
        });
    });

// Add deploy command for Workers
program
    .command('deploy [name]')
    .description('Deploy a Cloudflare Worker')
    .option('--env <environment>', 'Target environment')
    .option('--no-dry-run', 'Skip dry run and deploy immediately')
    .action(async (name, options) => {
        const { deployWorker } = await import('./commands/dashboard.js');
        await deployWorker(name, {
            env: options.env,
            dryRun: options.dryRun,
        });
    });

// Add R2 management commands
program
    .command('r2 <action> [bucket-name]')
    .description('Manage R2 buckets (actions: list, create, delete)')
    .action(async (action, bucketName) => {
        const { manageR2Bucket } = await import('./commands/dashboard.js');
        if (!['list', 'create', 'delete'].includes(action)) {
            console.error('Invalid action. Use: list, create, or delete');
            process.exit(1);
        }
        await manageR2Bucket(action as 'list' | 'create' | 'delete', bucketName);
    });

// Add log tailing command
program
    .command('logs [worker-name]')
    .description('Tail worker logs in real-time')
    .option('--format <format>', 'Output format (json or pretty)', 'pretty')
    .option('--status <status>', 'Filter by status (ok or error)')
    .option('--method <method>', 'Filter by HTTP method')
    .option('--search <term>', 'Search logs for specific term')
    .action(async (workerName, options) => {
        const { tailWorkerLogs } = await import('./commands/dashboard.js');
        await tailWorkerLogs(workerName, {
            format: options.format as 'json' | 'pretty',
            status: options.status as 'ok' | 'error' | undefined,
            method: options.method,
            search: options.search,
        });
    });

// Add IPC server command
program
    .command('ipc')
    .description('Start IPC server for inter-process communication')
    .option('-p, --port <port>', 'Port to listen on', '9123')
    .option('-s, --socket <path>', 'Unix socket path')
    .option('-d, --daemon', 'Run as daemon')
    .option('-v, --verbose', 'Verbose output')
    .option('-t, --token <token>', 'Authentication token')
    .action(async (options) => {
        const { startIPC } = await import('./commands/ipc.js');
        await startIPC({
            port: options.port ? Number.parseInt(options.port) : undefined,
            socketPath: options.socket,
            daemon: options.daemon,
            verbose: options.verbose,
            authToken: options.token,
        });
    });

// Add IPC test command
program
    .command('ipc-test')
    .description('Test connection to IPC server')
    .option('-p, --port <port>', 'Port to connect to', '9123')
    .option('-s, --socket <path>', 'Unix socket path')
    .option('-h, --host <host>', 'Host to connect to', '127.0.0.1')
    .option('-t, --token <token>', 'Authentication token')
    .action(async (options) => {
        const { testIPC } = await import('./commands/ipc.js');
        await testIPC({
            port: options.port ? Number.parseInt(options.port) : undefined,
            socketPath: options.socket,
            host: options.host,
            authToken: options.token,
        });
    });

// Add TUI dashboard command
program
    .command('tui')
    .description('Launch interactive TUI dashboard for Cloudflare Workers monitoring')
    .option('-p, --port <port>', 'IPC server port to connect to', '9123')
    .option('-h, --host <host>', 'IPC server host to connect to', '127.0.0.1')
    .option('-t, --token <token>', 'Authentication token for IPC server')
    .option('-r, --refresh <interval>', 'Refresh interval in milliseconds', '5000')
    .option('--theme <theme>', 'Color theme (dark or light)', 'dark')
    .action(async (options) => {
        const { startTUI } = await import('./commands/tui-dashboard.js');
        await startTUI({
            port: options.port ? Number.parseInt(options.port) : undefined,
            host: options.host,
            token: options.token,
            refreshInterval: options.refresh ? Number.parseInt(options.refresh) : undefined,
            theme: options.theme as 'dark' | 'light',
        });
    });

// Parse command line arguments, accounting for pnpm's `--` forwarding.
const sanitizedUserArgs = process.argv.slice(2).filter((arg) => arg !== '--');

if (sanitizedUserArgs.length === 0) {
    program.outputHelp();
    process.exit(0);
}

const argvToParse = [...process.argv];
// Drop pnpm's '--' separator so Commander still sees forwarded flags.
const separatorIndex = argvToParse.indexOf('--');
if (separatorIndex !== -1) {
    argvToParse.splice(separatorIndex, 1);
}

program.parse(argvToParse);
