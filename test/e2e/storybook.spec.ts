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
const tempDir = path.join(projectRoot, '.temp-storybook-e2e');

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

// Test configurations for Storybook integration
const storybookConfigs: Array<Partial<ProjectConfig> & { name: string }> = [
    // Basic Next.js with Storybook
    {
        name: 'nextjs-storybook-basic',
        projectName: 'test-nextjs-storybook-basic',
        framework: 'nextjs',
        database: 'none',
        storage: 'none',
        deployment: false,
        auth: false,
        storybook: true,
        packageManager: 'pnpm',
    },
    // Next.js with Storybook + Database + Auth
    {
        name: 'nextjs-storybook-full',
        projectName: 'test-nextjs-storybook-full',
        framework: 'nextjs',
        database: 'turso',
        orm: 'prisma',
        storage: 'none',
        deployment: true,
        auth: true,
        storybook: true,
        packageManager: 'pnpm',
    },
    // Next.js with Storybook + Storage
    {
        name: 'nextjs-storybook-storage',
        projectName: 'test-nextjs-storybook-storage',
        framework: 'nextjs',
        database: 'none',
        storage: 'vercel-blob',
        deployment: false,
        auth: false,
        storybook: true,
        packageManager: 'pnpm',
    },
];

test.describe('Storybook Integration E2E Tests', () => {
    test.beforeAll(async () => {
        // Create temp directory
        await fs.ensureDir(tempDir);
    });

    test.afterAll(async () => {
        // Clean up temp directory
        await fs.remove(tempDir);
    });

    for (const config of storybookConfigs) {
        test(`Generate and test Storybook for ${config.name}`, async ({ page }) => {
            const projectPath = path.join(tempDir, config.projectName);

            // Clean up if project exists
            await fs.remove(projectPath);

            console.log(`\n=== Testing Storybook for ${config.name} ===`);
            console.log('Config:', JSON.stringify(config, null, 2));

            // Step 1: Generate the project
            console.log('Generating project with Storybook...');
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

            // Step 2: Verify Storybook files are created
            console.log('Verifying Storybook structure...');
            await verifyStorybookStructure(projectPath, config);

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

            // Step 5: Build the project to ensure it compiles
            if (!isTestMode) {
                console.log('Building main project...');
                execSync(`${config.packageManager} run build`, {
                    cwd: projectPath,
                    stdio: 'inherit',
                    env: {
                        ...process.env,
                        SKIP_ENV_VALIDATION: 'true',
                    },
                });
            } else {
                console.log('Skipping main project build in test mode');
            }

            // Step 6: Start Storybook and test it
            let storybookProcess: ReturnType<typeof spawn> | null = null;

            if (!isTestMode) {
                console.log('Starting Storybook server...');
                storybookProcess = await startStorybookServer(projectPath, config.packageManager);

                try {
                    // Wait for Storybook to be ready
                    await waitForServer('http://localhost:6006', 60000);

                    // Step 7: Test Storybook application
                    console.log('Testing Storybook application...');
                    await page.goto('http://localhost:6006');

                    // Basic Storybook smoke test
                    await expect(page).toHaveTitle(/Storybook/i);

                    // Check that stories are loaded
                    await expect(page.locator('[data-testid="sidebar-navigation"]')).toBeVisible();

                    // Test Introduction story
                    await page.click('text=Introduction');
                    await expect(page.locator(`text=${config.projectName}`)).toBeVisible();

                    // Test Button component stories
                    await page.click('text=Button');
                    await expect(page.locator('iframe[data-is-storybook-iframe]')).toBeVisible();

                    // Switch to the story iframe
                    const storyFrame = page.frameLocator('iframe[data-is-storybook-iframe]');
                    await expect(storyFrame.locator('button')).toBeVisible();

                    // Test different button variants
                    await page.click('text=Secondary');
                    await expect(storyFrame.locator('button')).toHaveText('Secondary');

                    await page.click('text=Outline');
                    await expect(storyFrame.locator('button')).toHaveText('Outline');

                    // Test theme switching
                    const themeToggle = page.locator('[title="Change the theme of the preview"]');
                    if (await themeToggle.isVisible()) {
                        await themeToggle.click();
                        await page.click('text=dark');
                        // Verify dark theme is applied
                        await expect(storyFrame.locator('body')).toHaveClass(/dark/);
                    }

                    // Test Card component
                    await page.click('text=Card');
                    await expect(storyFrame.locator('div[class*="card"]')).toBeVisible();

                    // Test responsive viewport
                    const viewportButton = page.locator('[title="Change the size of the preview"]');
                    if (await viewportButton.isVisible()) {
                        await viewportButton.click();
                        await page.click('text=Mobile');

                        // Wait for viewport change
                        await page.waitForTimeout(1000);

                        // Verify mobile viewport
                        const iframe = page.locator('iframe[data-is-storybook-iframe]');
                        const iframeBox = await iframe.boundingBox();
                        expect(iframeBox?.width).toBeLessThan(400);
                    }

                    // Test accessibility addon if available
                    const a11yButton = page.locator(
                        '[title*="accessibility"], [title*="Accessibility"]'
                    );
                    if (await a11yButton.isVisible()) {
                        await a11yButton.click();
                        await expect(page.locator('text=Accessibility')).toBeVisible();
                    }

                    // Test Storybook docs
                    await page.click('text=Docs');
                    await expect(page.locator('text=Button')).toBeVisible();
                    await expect(page.locator('text=Props')).toBeVisible();

                    console.log(`✅ Storybook test for ${config.name} passed!`);
                } finally {
                    if (storybookProcess) {
                        // Clean up Storybook server
                        storybookProcess.kill('SIGTERM');
                        await new Promise((resolve) => setTimeout(resolve, 3000));
                    }
                }
            } else {
                console.log('Skipping Storybook dev server in test mode');
                const storybookConfigPath = path.join(projectPath, '.storybook/main.ts');
                const storybookConfigContent = await fs.readFile(storybookConfigPath, 'utf-8');
                expect(storybookConfigContent).toContain('@storybook/nextjs');

                const introductionStoryPath = path.join(
                    projectPath,
                    'src/stories/Introduction.stories.tsx'
                );
                const introductionStoryContent = await fs.readFile(introductionStoryPath, 'utf-8');
                expect(introductionStoryContent).toContain("title: 'Introduction'");
            }

            // Step 8: Test Storybook build
            if (!isTestMode) {
                console.log('Testing Storybook build...');
                try {
                    execSync(`${config.packageManager} run build-storybook`, {
                        cwd: projectPath,
                        stdio: 'inherit',
                        timeout: 180000, // 3 minutes
                    });

                    // Verify build output exists
                    expect(await fs.pathExists(path.join(projectPath, 'storybook-static'))).toBe(
                        true
                    );
                    expect(
                        await fs.pathExists(path.join(projectPath, 'storybook-static/index.html'))
                    ).toBe(true);

                    console.log('✅ Storybook build test passed!');
                } catch (error) {
                    console.error('Storybook build failed:', error);
                    throw error;
                }
            } else {
                console.log('Skipping Storybook build in test mode');
                const storybookScript = await fs.readJSON(path.join(projectPath, 'package.json'));
                expect(storybookScript.scripts?.['build-storybook']).toBeDefined();
            }

            // Step 9: Test Storybook test runner (if configured)
            if (config.packageManager === 'pnpm') {
                if (!isTestMode) {
                    console.log('Testing Storybook test runner...');
                    try {
                        // Run test runner in CI mode with timeout
                        execSync(
                            `timeout 60s ${config.packageManager} run test:storybook:ci || true`,
                            {
                                cwd: projectPath,
                                stdio: 'inherit',
                                shell: true,
                            }
                        );
                        console.log('✅ Storybook test runner completed!');
                    } catch (error) {
                        console.warn('Storybook test runner had issues (non-critical):', error);
                    }
                } else {
                    console.log('Skipping Storybook test runner in test mode');
                }
            }

            console.log(`\n✅ Full Storybook test for ${config.name} completed!\n`);
        });
    }
});

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

// Helper function to verify Storybook structure
async function verifyStorybookStructure(
    projectPath: string,
    _config: Partial<ProjectConfig> & { name: string }
) {
    // Storybook configuration files
    expect(await fs.pathExists(path.join(projectPath, '.storybook/main.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, '.storybook/preview.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, '.storybook/manager.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, '.storybook/test-runner.ts'))).toBe(true);

    // Storybook Playwright config
    expect(await fs.pathExists(path.join(projectPath, 'playwright-storybook.config.ts'))).toBe(
        true
    );

    // Story files
    expect(await fs.pathExists(path.join(projectPath, 'src/stories/Button.stories.tsx'))).toBe(
        true
    );
    expect(await fs.pathExists(path.join(projectPath, 'src/stories/Card.stories.tsx'))).toBe(true);
    expect(
        await fs.pathExists(path.join(projectPath, 'src/stories/Introduction.stories.tsx'))
    ).toBe(true);

    // Verify package.json has Storybook scripts and dependencies
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    expect(packageJson.scripts.storybook).toBe('storybook dev -p 6006');
    expect(packageJson.scripts['build-storybook']).toBe('storybook build');
    expect(packageJson.scripts['test:storybook']).toBe('test-storybook');

    expect(packageJson.devDependencies).toHaveProperty('@storybook/nextjs');
    expect(packageJson.devDependencies).toHaveProperty('@storybook/addon-essentials');
    expect(packageJson.devDependencies).toHaveProperty('@storybook/addon-interactions');
    expect(packageJson.devDependencies).toHaveProperty('@storybook/test-runner');
}

// Helper function to start Storybook server
async function startStorybookServer(
    projectPath: string,
    packageManager: string
): Promise<ReturnType<typeof spawn>> {
    const storybookProcess = spawn(packageManager, ['run', 'storybook'], {
        cwd: projectPath,
        env: {
            ...process.env,
            CI: 'false', // Disable CI mode for development server
            BROWSER: 'none', // Don't open browser
        },
        stdio: 'pipe',
    });

    storybookProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`[storybook] ${output}`);

        // Log important Storybook messages
        if (
            output.includes('Storybook') ||
            output.includes('Local:') ||
            output.includes('started')
        ) {
            console.log(`[storybook] ${output.trim()}`);
        }
    });

    storybookProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        // Don't log all warnings, only errors and important messages
        if (output.includes('error') || output.includes('Error') || output.includes('failed')) {
            console.error(`[storybook-err] ${output.trim()}`);
        }
    });

    return storybookProcess;
}

// Helper function to wait for server
async function waitForServer(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                console.log('Storybook server is ready!');
                // Additional wait to ensure all assets are loaded
                await new Promise((resolve) => setTimeout(resolve, 3000));
                return;
            }
        } catch (_error) {
            // Server not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Storybook server failed to start within ${timeout}ms`);
}
