import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { cleanupSharedStorybookBuild } from './global-setup-storybook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Global teardown for Storybook E2E tests
 * Cleans up shared resources and temporary files
 */
export default async function globalTeardown() {
    console.log('🧹 Starting global Storybook teardown...');

    // Clean up shared Storybook build
    await cleanupSharedStorybookBuild();

    // Clean up main temp directory
    const tempDir = path.join(projectRoot, '.temp-storybook-e2e');
    if (await fs.pathExists(tempDir)) {
        console.log('🧹 Cleaning up temporary E2E test files...');
        await fs.remove(tempDir);
        console.log('✅ Temporary E2E test files cleaned up');
    }

    // Clean up any remaining test artifacts
    const testResultsDir = path.join(projectRoot, 'test-results');
    if (await fs.pathExists(testResultsDir)) {
        // Only clean up storybook-specific results, keep other test results
        const storybookResultsDir = path.join(testResultsDir, 'storybook');
        if (await fs.pathExists(storybookResultsDir)) {
            console.log('🧹 Cleaning up Storybook test results...');
            await fs.remove(storybookResultsDir);
        }
    }

    console.log('✅ Global Storybook teardown completed');
}
