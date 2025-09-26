import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Global setup for Storybook E2E tests with build sharing optimization
 * This setup builds Storybook once and shares it across test workers
 */
export default async function globalSetup() {
    console.log('🚀 Starting global Storybook setup...');

    const tempDir = path.join(projectRoot, '.temp-storybook-e2e');
    const sharedStorybookDir = path.join(projectRoot, '.temp-shared-storybook');

    // Create directories
    await fs.ensureDir(tempDir);
    await fs.ensureDir(sharedStorybookDir);

    // Check if we're in CI and should optimize for sharing
    if (process.env.CI) {
        console.log('📦 CI environment detected - optimizing for build sharing');

        // Generate a sample project for build sharing
        const sampleProjectPath = path.join(sharedStorybookDir, 'sample-project');

        try {
            // Only build if sample project doesn't exist
            if (!(await fs.pathExists(sampleProjectPath))) {
                console.log('🔨 Building sample Storybook project for sharing...');

                // Import the createProject function dynamically
                const { createProject } = await import('../../src/commands/create/index.js');

                // Create a basic Next.js project with Storybook
                await createProject({
                    projectName: 'sample-project',
                    projectPath: sampleProjectPath,
                    framework: 'nextjs',
                    database: 'none',
                    storage: 'none',
                    deployment: false,
                    auth: false,
                    storybook: true,
                    packageManager: 'pnpm',
                    mode: 'full',
                });

                console.log('📦 Installing dependencies for sample project...');
                execSync('pnpm install', {
                    cwd: sampleProjectPath,
                    stdio: 'inherit',
                });

                console.log('🔨 Building sample Storybook...');
                execSync('pnpm run build-storybook', {
                    cwd: sampleProjectPath,
                    stdio: 'inherit',
                    timeout: 300000, // 5 minutes
                });

                // Copy the built Storybook for sharing
                const storybookStaticPath = path.join(sampleProjectPath, 'storybook-static');
                const sharedStorybookBuildPath = path.join(sharedStorybookDir, 'storybook-static');

                if (await fs.pathExists(storybookStaticPath)) {
                    await fs.copy(storybookStaticPath, sharedStorybookBuildPath);
                    console.log('✅ Sample Storybook built and ready for sharing');
                }
            } else {
                console.log('📦 Using existing sample Storybook build');
            }

            // Store build info for test workers
            const buildInfo = {
                buildPath: path.join(sharedStorybookDir, 'storybook-static'),
                timestamp: new Date().toISOString(),
                projectPath: sampleProjectPath,
            };

            await fs.writeJSON(path.join(sharedStorybookDir, 'build-info.json'), buildInfo, {
                spaces: 2,
            });
        } catch (error) {
            console.error('❌ Failed to setup shared Storybook build:', error);
            // Continue anyway - tests can build their own if needed
        }
    }

    // Set up environment variables for test sharing
    process.env.SHARED_STORYBOOK_DIR = sharedStorybookDir;
    process.env.TEMP_E2E_DIR = tempDir;

    console.log('✅ Global Storybook setup completed');
}

/**
 * Helper function that test files can use to check if shared build exists
 */
export async function getSharedStorybookBuild(): Promise<string | null> {
    const sharedDir = process.env.SHARED_STORYBOOK_DIR;
    if (!sharedDir) {
        return null;
    }

    const buildInfoPath = path.join(sharedDir, 'build-info.json');
    const buildPath = path.join(sharedDir, 'storybook-static');

    try {
        if ((await fs.pathExists(buildInfoPath)) && (await fs.pathExists(buildPath))) {
            const buildInfo = await fs.readJSON(buildInfoPath);
            console.log(`📦 Using shared Storybook build from ${buildInfo.timestamp}`);
            return buildPath;
        }
    } catch (error) {
        console.warn('⚠️ Could not access shared Storybook build:', error);
    }

    return null;
}

/**
 * Cleanup function for global teardown
 */
export async function cleanupSharedStorybookBuild() {
    const sharedDir = process.env.SHARED_STORYBOOK_DIR;
    if (sharedDir && (await fs.pathExists(sharedDir))) {
        console.log('🧹 Cleaning up shared Storybook build...');
        await fs.remove(sharedDir);
        console.log('✅ Shared Storybook build cleaned up');
    }
}
