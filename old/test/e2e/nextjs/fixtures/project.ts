import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { execa, type ExecaChildProcess } from 'execa';
import { test as base, expect, type TestInfo } from '@playwright/test';
import { generateProject } from '../../../helpers/project-generator.js';
import { cleanupAllTempDirs } from '../../../helpers/temp-dir.js';

type DatabaseOption = 'none' | 'turso' | 'supabase';
type OrmOption = 'prisma' | 'drizzle' | undefined;
type StorageOption = 'none' | 'filesystem' | 'vercel-blob' | 'supabase' | 's3' | 'r2';

type PackageJson = {
    scripts?: Record<string, string>;
};

type RunCommand = (
    command: string,
    args: string[],
    options?: { env?: NodeJS.ProcessEnv }
) => Promise<void>;

export interface NextjsProjectContext {
    projectPath: string;
    baseURL: string;
    stack: NextjsStackOptions;
    adminUser: { email: string; password: string };
    defaultUserPassword: string;
    storageDir: string;
    run: RunCommand;
    packageJson: PackageJson;
}

export interface NextjsStackOptions {
    database: DatabaseOption;
    orm?: OrmOption;
    storage?: StorageOption;
    auth?: boolean;
    deployment?: boolean;
    packageManager?: 'pnpm' | 'npm' | 'yarn';
}

const DEFAULT_STACK: Readonly<NextjsStackOptions> = {
    database: 'turso',
    orm: 'prisma',
    storage: 'vercel-blob',
    auth: true,
    deployment: true,
    packageManager: 'pnpm',
};

const ADMIN_USER = Object.freeze({ email: 'admin@example.com', password: 'Admin123!' });
const DEFAULT_USER_PASSWORD = 'TempPass123!';

async function getAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();

        server.on('error', (error) => {
            server.close();
            reject(error);
        });

        server.listen(0, () => {
            const address = server.address();
            if (typeof address === 'object' && address) {
                const port = address.port;
                server.close(() => resolve(port));
            } else {
                server.close(() => reject(new Error('Failed to acquire an ephemeral port')));
            }
        });
    });
}

async function waitForServer(url: string, timeoutMs = 180_000) {
    const start = Date.now();
    let lastFailure: { status: number; body: string } | null = null;

    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url, { redirect: 'manual' });
            if (response.status < 500) {
                return;
            }

            const body = await response.text();
            let normalizedBody = body
                .replaceAll('\n', ' ')
                .replaceAll('\r', ' ')
                .replaceAll('\t', ' ');
            normalizedBody = normalizedBody.replace(/ {2,}/g, ' ').trim();
            lastFailure = {
                status: response.status,
                body: normalizedBody.slice(0, 1000),
            };
        } catch (error) {
            lastFailure = {
                status: -1,
                body: error instanceof Error ? error.message : 'Unknown network error',
            };
        }

        await sleep(500);
    }

    if (lastFailure) {
        throw new Error(
            `Server did not become ready at ${url} within ${timeoutMs}ms (last response: ${lastFailure.status} ${lastFailure.body})`
        );
    }

    throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

async function runCommand(
    command: string,
    args: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv }
) {
    const child: ExecaChildProcess = execa(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdout: 'pipe',
        stderr: 'pipe',
    });

    child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr?.on('data', (chunk) => process.stderr.write(chunk));

    await child;
}

async function runScriptIfExists(
    script: string,
    pkg: PackageJson,
    runner: RunCommand,
    options?: { env?: NodeJS.ProcessEnv }
): Promise<boolean> {
    if (!pkg.scripts?.[script]) {
        return false;
    }

    await runner('pnpm', ['run', script], options);
    return true;
}

async function normalizeTemplateExtensions(directory: string) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    await Promise.all(
        entries.map(async (entry) => {
            const entryPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                await normalizeTemplateExtensions(entryPath);
                return;
            }

            if (entry.isFile() && entry.name.endsWith('.template')) {
                const targetPath = entryPath.replace(/\.template$/, '');
                await fs.rename(entryPath, targetPath);
            }
        })
    );
}

async function ensureDatabaseReady(
    stack: NextjsStackOptions,
    pkg: PackageJson,
    runner: RunCommand,
    projectPath: string,
    env: NodeJS.ProcessEnv,
    testInfo: TestInfo
) {
    if (stack.database === 'none' || !stack.orm) {
        return;
    }

    if (stack.database === 'supabase') {
        try {
            await runner('supabase', ['--version'], { env });
        } catch (error) {
            testInfo.skip(`Supabase CLI is required for supabase tests (${String(error)})`);
        }

        if (!pkg.scripts?.['supabase:start']) {
            testInfo.skip('Generated project does not expose supabase:start script yet');
        }

        await runScriptIfExists('supabase:start', pkg, runner, { env });
    }

    if (stack.orm === 'prisma') {
        await runner('pnpm', ['exec', 'prisma', 'generate'], { env });
    }

    const pushed =
        (await runScriptIfExists('db:push:force', pkg, runner, { env })) ||
        (await runScriptIfExists('db:push', pkg, runner, { env }));

    if (!pushed && stack.orm === 'prisma') {
        await runner('pnpm', ['exec', 'prisma', 'db', 'push', '--force-reset', '--skip-generate'], {
            env,
        });
    }

    await runScriptIfExists('db:seed', pkg, runner, { env });

    if (stack.database === 'supabase') {
        await sleep(5_000);
    }

    if (stack.database === 'turso' && stack.orm === 'prisma') {
        const prismaDbCandidates = [
            path.join(projectPath, 'prisma', 'dev.db'),
            path.join(projectPath, 'prisma', 'prisma', 'dev.db'),
        ];

        let hasDatabaseFile = false;
        for (const candidate of prismaDbCandidates) {
            // eslint-disable-next-line no-await-in-loop -- ここでは逐次チェックのコストが小さい
            const exists = await fs
                .stat(candidate)
                .then(() => true)
                .catch(() => false);
            if (exists) {
                hasDatabaseFile = true;
                break;
            }
        }

        if (!hasDatabaseFile) {
            const prismaDirEntries = await fs.readdir(path.join(projectPath, 'prisma'));
            throw new Error(
                `Expected Prisma dev.db to exist after database setup (found: ${prismaDirEntries.join(', ')})`
            );
        }
    }
}

export const test = base.extend<{
    stack: NextjsStackOptions;
    project: NextjsProjectContext;
}>({
    stack: [{ ...DEFAULT_STACK }, { option: true }],
    project: [
        async ({ stack }, use, testInfo) => {
            const now = Date.now();
            const slug = testInfo.project.name.replace(/[^a-z0-9-]/gi, '-').replace(/-{2,}/g, '-');
            const uniqueName = `${slug || 'next-e2e'}-${now}`.toLowerCase();
            const { projectPath } = await generateProject({
                projectName: uniqueName,
                framework: 'nextjs',
                database: stack.database,
                orm: stack.orm,
                storage: stack.storage,
                auth: stack.auth,
                deployment: stack.deployment ?? true,
                packageManager: stack.packageManager ?? 'pnpm',
            });

            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(
                await fs.readFile(packageJsonPath, 'utf8')
            ) as PackageJson;

            await normalizeTemplateExtensions(projectPath);

            const env: NodeJS.ProcessEnv = {
                ...process.env,
                HUSKY: '0',
                NEXT_TELEMETRY_DISABLED: '1',
                // Allow Prisma dangerous operations in test environment only
                // This is safe because we're using temporary test databases
                PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'test-environment-consent',
            };

            if (stack.database === 'turso') {
                env.DATABASE_URL ??= 'file:./prisma/dev.db';
            }

            const runner: RunCommand = async (command, args, options) => {
                await runCommand(command, args, {
                    cwd: projectPath,
                    env: {
                        ...env,
                        ...options?.env,
                    },
                });
            };

            let devServer: ExecaChildProcess | undefined;
            const devLogs: string[] = [];

            try {
                await runner('pnpm', ['install']);
                await ensureDatabaseReady(stack, packageJson, runner, projectPath, env, testInfo);

                const port = await getAvailablePort();
                const baseURL = `http://127.0.0.1:${port}`;

                const serverEnv: NodeJS.ProcessEnv = {
                    ...env,
                    NODE_ENV: 'development',
                    PORT: String(port),
                    NEXT_PUBLIC_APP_URL: baseURL,
                    BETTER_AUTH_URL: baseURL,
                };

                devServer = execa(
                    'pnpm',
                    ['exec', 'next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
                    {
                        cwd: projectPath,
                        env: serverEnv,
                        stdout: 'pipe',
                        stderr: 'pipe',
                    }
                );

                devServer.stdout?.on('data', (chunk) => {
                    const text = chunk.toString();
                    devLogs.push(`[stdout] ${text}`);
                    process.stdout.write(`[dev] ${text}`);
                });

                devServer.stderr?.on('data', (chunk) => {
                    const text = chunk.toString();
                    devLogs.push(`[stderr] ${text}`);
                    process.stderr.write(`[dev] ${text}`);
                });

                await waitForServer(`${baseURL}/login`);

                await use({
                    projectPath,
                    baseURL,
                    stack,
                    adminUser: ADMIN_USER,
                    defaultUserPassword: DEFAULT_USER_PASSWORD,
                    storageDir: path.join(projectPath, '.storage'),
                    run: runner,
                    packageJson,
                });
            } finally {
                if (devServer) {
                    devServer.kill('SIGINT');
                    try {
                        await devServer;
                    } catch (error) {
                        const ignorable = error as { code?: number };
                        if (ignorable?.code && ignorable.code !== 0 && ignorable.code !== 1) {
                            // Log the error instead of throwing in finally block
                            console.error('Dev server shutdown error:', error);
                        }
                    }
                }

                if (stack.database === 'supabase') {
                    try {
                        await runScriptIfExists('supabase:stop', packageJson, runner);
                    } catch (error) {
                        testInfo.attach('supabase-stop-error.log', {
                            body: String(error),
                            contentType: 'text/plain',
                        });
                    }
                }

                if (devLogs.length > 0) {
                    await testInfo.attach('dev-server.log', {
                        body: devLogs.join(''),
                        contentType: 'text/plain',
                    });
                }

                await cleanupAllTempDirs();
            }
        },
        { scope: 'test' },
    ],
});

export { expect };
