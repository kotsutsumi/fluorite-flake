import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import fs from 'fs-extra';
import { createProject } from '../../src/commands/create/index.js';
import type { ProjectConfig } from '../../src/commands/create/types.js';
import type { CloudProvisioningRecord } from '../../src/utils/cloud/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const tempDir = path.join(projectRoot, '.temp-e2e');

if (process.env.FLUORITE_TEST_MODE === undefined) {
    process.env.FLUORITE_TEST_MODE = 'true';
}
if (process.env.FLUORITE_CLOUD_MODE === undefined) {
    process.env.FLUORITE_CLOUD_MODE = 'mock';
}
if (process.env.FLUORITE_AUTO_PROVISION === undefined) {
    process.env.FLUORITE_AUTO_PROVISION = 'true';
}
if (process.env.NODE_ENV === undefined) {
    process.env.NODE_ENV = 'test';
}

const isTestMode = process.env.FLUORITE_TEST_MODE === 'true';

// Test configurations matrix
const testConfigs: Array<Partial<ProjectConfig> & { name: string }> = [
    // Basic Next.js without database
    {
        name: 'nextjs-basic',
        projectName: 'test-nextjs-basic',
        framework: 'nextjs',
        database: 'none',
        storage: 'none',
        deployment: false,
        packageManager: 'pnpm',
        auth: false,
    },
    // Next.js with Turso + Prisma
    {
        name: 'nextjs-turso-prisma',
        projectName: 'test-nextjs-turso-prisma',
        framework: 'nextjs',
        database: 'turso',
        orm: 'prisma',
        storage: 'none',
        deployment: true,
        auth: true,
        packageManager: 'pnpm',
    },
    // Next.js with Turso + Drizzle (auth not supported with Drizzle)
    {
        name: 'nextjs-turso-drizzle',
        projectName: 'test-nextjs-turso-drizzle',
        framework: 'nextjs',
        database: 'turso',
        orm: 'drizzle',
        storage: 'none',
        deployment: false,
        auth: false,
        packageManager: 'pnpm',
    },
    // Next.js with Supabase + Prisma
    {
        name: 'nextjs-supabase-prisma',
        projectName: 'test-nextjs-supabase-prisma',
        framework: 'nextjs',
        database: 'supabase',
        orm: 'prisma',
        storage: 'supabase-storage',
        deployment: true,
        auth: true,
        packageManager: 'pnpm',
    },
    // Next.js with Supabase + Drizzle (auth not supported with Drizzle)
    {
        name: 'nextjs-supabase-drizzle',
        projectName: 'test-nextjs-supabase-drizzle',
        framework: 'nextjs',
        database: 'supabase',
        orm: 'drizzle',
        storage: 'none',
        deployment: false,
        auth: false,
        packageManager: 'pnpm',
    },
    // Next.js with Vercel Blob storage
    {
        name: 'nextjs-vercel-blob',
        projectName: 'test-nextjs-blob',
        framework: 'nextjs',
        database: 'none',
        storage: 'vercel-blob',
        deployment: true,
        auth: false,
        packageManager: 'pnpm',
    },
    // Next.js with AWS S3
    {
        name: 'nextjs-aws-s3',
        projectName: 'test-nextjs-s3',
        framework: 'nextjs',
        database: 'none',
        storage: 'aws-s3',
        deployment: false,
        auth: false,
        packageManager: 'pnpm',
    },
    // Next.js with Cloudflare R2
    {
        name: 'nextjs-cloudflare-r2',
        projectName: 'test-nextjs-r2',
        framework: 'nextjs',
        database: 'none',
        storage: 'cloudflare-r2',
        deployment: false,
        auth: false,
        packageManager: 'pnpm',
    },
    // Next.js with Storybook
    {
        name: 'nextjs-storybook-basic',
        projectName: 'test-nextjs-storybook',
        framework: 'nextjs',
        database: 'none',
        storage: 'none',
        deployment: false,
        auth: false,
        storybook: true,
        packageManager: 'pnpm',
    },
    // Next.js with Storybook + Full Stack
    {
        name: 'nextjs-storybook-full',
        projectName: 'test-nextjs-storybook-full',
        framework: 'nextjs',
        database: 'turso',
        orm: 'prisma',
        storage: 'vercel-blob',
        deployment: true,
        auth: true,
        storybook: true,
        packageManager: 'pnpm',
    },
];

test.describe('Next.js Project Generation E2E Tests', () => {
    test.beforeAll(async () => {
        // Create temp directory
        await fs.ensureDir(tempDir);
    });

    test.afterAll(async () => {
        // Clean up temp directory
        await fs.remove(tempDir);
    });

    for (const config of testConfigs) {
        test(`Generate and test ${config.name}`, async ({ page }) => {
            const projectPath = path.join(tempDir, config.projectName);

            // Clean up if project exists
            await fs.remove(projectPath);

            console.log(`\n=== Testing ${config.name} ===`);
            console.log('Config:', JSON.stringify(config, null, 2));

            // Step 1: Generate the project
            console.log('Generating project...');
            try {
                const projectConfig: ProjectConfig = {
                    ...config,
                    projectPath,
                } as ProjectConfig;

                await createProject(projectConfig);
            } catch (error) {
                console.error('Failed to generate project:', error);
                throw error;
            }

            // Step 2: Verify project structure
            console.log('Verifying project structure...');
            await verifyProjectStructure(projectPath, config);

            // Step 3: Validate provisioning artifacts
            await verifyProvisioningSnapshot(projectPath, config);

            // Step 4: Install dependencies
            if (!isTestMode) {
                console.log('Installing dependencies...');
                execSync(`${config.packageManager} install`, {
                    cwd: projectPath,
                    stdio: 'inherit',
                });
            } else {
                console.log('Skipping dependency installation in test mode');
            }

            // Step 5: Set up environment variables for immediate use
            console.log('Setting up environment...');
            await setupEnvironment(projectPath, config);

            // Step 6: Run build to verify TypeScript and compilation
            if (!isTestMode) {
                console.log('Building project...');
                try {
                    execSync(`${config.packageManager} run build`, {
                        cwd: projectPath,
                        stdio: 'inherit',
                        env: {
                            ...process.env,
                            SKIP_ENV_VALIDATION: 'true',
                        },
                    });
                } catch (error) {
                    console.error('Build failed:', error);
                    throw error;
                }
            } else {
                console.log('Skipping build step in test mode');
            }

            // Step 7: Start dev server and test
            let devProcess: ReturnType<typeof spawn> | null = null;

            if (!isTestMode) {
                console.log('Starting dev server...');
                devProcess = await startDevServer(projectPath, config.packageManager);

                try {
                    // Wait for server to be ready
                    await waitForServer('http://localhost:3000', 30000);

                    // Step 8: Test the application
                    console.log('Testing application...');
                    await page.goto('http://localhost:3000');

                    // Basic smoke test - verify page loads
                    await expect(page).toHaveTitle(/test-nextjs/i);
                    const heading = page.locator('h1, h2').first();
                    await expect(heading).toBeVisible();

                    // Test auth pages if auth is enabled
                    if (config.auth && config.database !== 'none') {
                        console.log('Testing auth pages...');
                        await page.goto('http://localhost:3000/login');
                        await expect(page.locator('text=/sign in/i')).toBeVisible();

                        await page.goto('http://localhost:3000/register');
                        await expect(page.locator('text=/sign up/i')).toBeVisible();
                    }

                    // Test API endpoints
                    if (config.storage !== 'none') {
                        console.log('Testing storage API...');
                        const response = await page.request.get('http://localhost:3000/api/upload');
                        expect([200, 405]).toContain(response.status());
                    }

                    // Verify deployment scripts if enabled
                    if (config.deployment) {
                        console.log('Verifying deployment configuration...');
                        const vercelJsonPath = path.join(projectPath, 'vercel.json');
                        expect(await fs.pathExists(vercelJsonPath)).toBe(true);
                    }
                } finally {
                    // Clean up dev server
                    if (devProcess) {
                        devProcess.kill('SIGTERM');
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                    }
                }
            } else {
                console.log('Skipping dev server start in test mode');
                // Auth projects have a different structure with (app)/page.tsx
                const pagePath = config.auth
                    ? path.join(projectPath, 'src/app/(app)/page.tsx')
                    : path.join(projectPath, 'src/app/page.tsx');

                const pageSource = await fs.readFile(pagePath, 'utf-8');
                expect(pageSource.includes('<main') || pageSource.includes('Dashboard')).toBe(true);

                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = await fs.readJSON(packageJsonPath);
                expect(packageJson.scripts?.dev).toBeDefined();

                const envLocalPath = path.join(projectPath, '.env.local');
                if (await fs.pathExists(envLocalPath)) {
                    const envContent = await fs.readFile(envLocalPath, 'utf-8');
                    expect(envContent).toContain('NEXTAUTH_URL=');
                }

                if (config.deployment) {
                    const vercelJsonPath = path.join(projectPath, 'vercel.json');
                    expect(await fs.pathExists(vercelJsonPath)).toBe(true);
                }
            }

            console.log(`✅ ${config.name} test passed!\n`);
        });
    }
});

// Helper function to verify project structure
async function verifyProjectStructure(
    projectPath: string,
    config: Partial<ProjectConfig> & { name: string }
) {
    // Basic Next.js structure
    expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, 'next.config.mjs'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);

    // Auth projects have a different structure
    if (config.auth) {
        expect(await fs.pathExists(path.join(projectPath, 'src/app/login/page.tsx'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/app/(app)/page.tsx'))).toBe(true);
    } else {
        expect(await fs.pathExists(path.join(projectPath, 'src/app/page.tsx'))).toBe(true);
    }
    expect(await fs.pathExists(path.join(projectPath, 'src/app/layout.tsx'))).toBe(true);

    // Database-specific files
    if (config.database !== 'none') {
        if (config.orm === 'prisma') {
            expect(await fs.pathExists(path.join(projectPath, 'prisma/schema.prisma'))).toBe(true);
        } else if (config.orm === 'drizzle') {
            expect(await fs.pathExists(path.join(projectPath, 'drizzle.config.ts'))).toBe(true);
            expect(await fs.pathExists(path.join(projectPath, 'src/db/schema.ts'))).toBe(true);
        }
    }

    // Auth files
    if (config.auth && config.database !== 'none') {
        expect(await fs.pathExists(path.join(projectPath, 'src/lib/auth.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'middleware.ts'))).toBe(true);
    }

    // Storage files
    if (config.storage !== 'none') {
        expect(await fs.pathExists(path.join(projectPath, 'src/lib/storage.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/app/api/upload/route.ts'))).toBe(
            true
        );
    }

    // Deployment files
    if (config.deployment) {
        expect(await fs.pathExists(path.join(projectPath, 'vercel.json'))).toBe(true);
    }

    // Storybook files
    if (config.storybook) {
        expect(await fs.pathExists(path.join(projectPath, '.storybook/main.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, '.storybook/preview.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/stories/Button.stories.tsx'))).toBe(
            true
        );
        expect(await fs.pathExists(path.join(projectPath, 'src/stories/Card.stories.tsx'))).toBe(
            true
        );
        expect(await fs.pathExists(path.join(projectPath, 'playwright-storybook.config.ts'))).toBe(
            true
        );
    }
}

// Helper function to validate provisioning artefacts
async function verifyProvisioningSnapshot(
    projectPath: string,
    config: Partial<ProjectConfig> & { name: string }
) {
    const recordPath = path.join(projectPath, 'fluorite-cloud.json');

    // Check if provisioning should have occurred
    const shouldHaveProvisioning =
        config.database === 'turso' ||
        config.database === 'supabase' ||
        config.storage !== 'none' ||
        config.deployment === true;

    if (!shouldHaveProvisioning) {
        // No cloud resources, so no provisioning file expected
        expect(await fs.pathExists(recordPath)).toBe(false);
        return;
    }

    expect(await fs.pathExists(recordPath)).toBe(true);

    const record = (await fs.readJSON(recordPath)) as CloudProvisioningRecord;
    const expectedProjectName = config.projectName ?? config.name;

    expect(record.mode).toBe('mock');
    expect(record.projectName).toBe(expectedProjectName);

    if (config.database === 'turso') {
        expect(record.turso?.databases.length ?? 0).toBeGreaterThan(0);
    } else if (config.database === 'supabase') {
        expect(record.supabase?.databases.length ?? 0).toBeGreaterThan(0);
    } else {
        expect(record.turso).toBeUndefined();
        expect(record.supabase).toBeUndefined();
    }

    if (config.storage === 'vercel-blob') {
        expect(record.vercelBlob?.readWriteToken).toBeTruthy();
    } else if (config.storage === 'cloudflare-r2') {
        expect(record.cloudflareR2?.bucketName).toBeTruthy();
    } else if (config.storage === 'aws-s3') {
        expect(record.awsS3?.bucketName).toBeTruthy();
    } else if (config.storage === 'supabase-storage') {
        expect(record.supabaseStorage?.bucketName).toBeTruthy();
    } else {
        expect(record.vercelBlob).toBeUndefined();
        expect(record.cloudflareR2).toBeUndefined();
        expect(record.awsS3).toBeUndefined();
        expect(record.supabaseStorage).toBeUndefined();
    }

    if (config.deployment) {
        expect(record.vercel?.productionUrl).toBeTruthy();
    } else {
        expect(record.vercel).toBeUndefined();
    }
}

// Helper function to setup environment
async function setupEnvironment(
    projectPath: string,
    config: Partial<ProjectConfig> & { name: string }
) {
    const envVars: Record<string, string> = {
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_SECRET: 'test-secret-for-e2e-testing',
    };

    // Database environment variables
    if (config.database === 'turso') {
        envVars.TURSO_DATABASE_URL = 'libsql://test.turso.io';
        envVars.TURSO_AUTH_TOKEN = 'test-token';
    } else if (config.database === 'supabase') {
        envVars.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
        envVars.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
        envVars.SUPABASE_SERVICE_KEY = 'test-service-key';
    }

    // Storage environment variables
    if (config.storage === 'vercel-blob') {
        envVars.BLOB_READ_WRITE_TOKEN = 'test-blob-token';
    } else if (config.storage === 'aws-s3') {
        envVars.AWS_ACCESS_KEY_ID = 'test-access-key';
        envVars.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
        envVars.AWS_REGION = 'us-east-1';
        envVars.AWS_S3_BUCKET = 'test-bucket';
    } else if (config.storage === 'cloudflare-r2') {
        envVars.R2_ACCOUNT_ID = 'test-account-id';
        envVars.R2_ACCESS_KEY_ID = 'test-access-key';
        envVars.R2_SECRET_ACCESS_KEY = 'test-secret-key';
        envVars.R2_BUCKET_NAME = 'test-bucket';
    }

    // Auth environment variables
    if (config.auth && config.database !== 'none') {
        envVars.BETTER_AUTH_SECRET = 'test-auth-secret';
        envVars.BETTER_AUTH_URL = 'http://localhost:3000';
    }

    // Write .env.local file
    const envContent = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    await fs.writeFile(path.join(projectPath, '.env.local'), envContent);
}

// Helper function to start dev server
async function startDevServer(
    projectPath: string,
    packageManager: string
): Promise<ReturnType<typeof spawn>> {
    const devProcess = spawn(packageManager, ['run', 'dev'], {
        cwd: projectPath,
        env: {
            ...process.env,
            PORT: '3000',
        },
        stdio: 'pipe',
    });

    devProcess.stdout?.on('data', (data) => {
        console.log(`[dev] ${data.toString()}`);
    });

    devProcess.stderr?.on('data', (data) => {
        console.error(`[dev-err] ${data.toString()}`);
    });

    return devProcess;
}

// Helper function to wait for server
async function waitForServer(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                console.log('Server is ready!');
                return;
            }
        } catch (_error) {
            // Server not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Server failed to start within ${timeout}ms`);
}
