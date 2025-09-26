import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    cleanupSharedStorybookBuild,
    getSharedStorybookBuild,
} from '../../test/e2e/global-setup-storybook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Global Storybook Setup', () => {
    const tempSharedDir = path.join(projectRoot, '.temp-shared-test');
    const originalEnv = process.env;

    beforeEach(async () => {
        // Clean up any existing temp directories
        await fs.remove(tempSharedDir);
        await fs.ensureDir(tempSharedDir);

        // Reset environment
        process.env = { ...originalEnv };
    });

    afterEach(async () => {
        // Clean up temp directories
        await fs.remove(tempSharedDir);

        // Restore original environment
        process.env = originalEnv;
    });

    describe('getSharedStorybookBuild', () => {
        it('should return null when SHARED_STORYBOOK_DIR is not set', async () => {
            process.env.SHARED_STORYBOOK_DIR = undefined;

            const result = await getSharedStorybookBuild();

            expect(result).toBeNull();
        });

        it('should return null when shared directory does not exist', async () => {
            process.env.SHARED_STORYBOOK_DIR = '/nonexistent/path';

            const result = await getSharedStorybookBuild();

            expect(result).toBeNull();
        });

        it('should return null when build-info.json does not exist', async () => {
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            // Create shared directory but no build info
            await fs.ensureDir(tempSharedDir);

            const result = await getSharedStorybookBuild();

            expect(result).toBeNull();
        });

        it('should return null when storybook-static directory does not exist', async () => {
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            // Create build-info.json but no storybook-static
            const buildInfo = {
                buildPath: path.join(tempSharedDir, 'storybook-static'),
                timestamp: new Date().toISOString(),
                projectPath: '/test/project',
            };

            await fs.writeJSON(path.join(tempSharedDir, 'build-info.json'), buildInfo);

            const result = await getSharedStorybookBuild();

            expect(result).toBeNull();
        });

        it('should return build path when shared build exists', async () => {
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            // Create build-info.json and storybook-static directory
            const buildPath = path.join(tempSharedDir, 'storybook-static');
            const buildInfo = {
                buildPath,
                timestamp: new Date().toISOString(),
                projectPath: '/test/project',
            };

            await fs.writeJSON(path.join(tempSharedDir, 'build-info.json'), buildInfo);
            await fs.ensureDir(buildPath);
            await fs.writeFile(path.join(buildPath, 'index.html'), '<html>Test Storybook</html>');

            const result = await getSharedStorybookBuild();

            expect(result).toBe(buildPath);
        });

        it('should handle corrupted build-info.json gracefully', async () => {
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            // Create corrupted build-info.json
            await fs.writeFile(path.join(tempSharedDir, 'build-info.json'), 'invalid json content');

            const result = await getSharedStorybookBuild();

            expect(result).toBeNull();
        });

        it('should verify build-info.json structure', async () => {
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            const buildPath = path.join(tempSharedDir, 'storybook-static');
            const timestamp = new Date().toISOString();
            const projectPath = '/test/project';

            const buildInfo = {
                buildPath,
                timestamp,
                projectPath,
            };

            await fs.writeJSON(path.join(tempSharedDir, 'build-info.json'), buildInfo);
            await fs.ensureDir(buildPath);

            const result = await getSharedStorybookBuild();

            expect(result).toBe(buildPath);

            // Verify the build info can be read correctly
            const savedBuildInfo = await fs.readJSON(path.join(tempSharedDir, 'build-info.json'));
            expect(savedBuildInfo.buildPath).toBe(buildPath);
            expect(savedBuildInfo.timestamp).toBe(timestamp);
            expect(savedBuildInfo.projectPath).toBe(projectPath);
        });
    });

    describe('cleanupSharedStorybookBuild', () => {
        it('should do nothing when SHARED_STORYBOOK_DIR is not set', async () => {
            process.env.SHARED_STORYBOOK_DIR = undefined;

            // Should not throw
            await cleanupSharedStorybookBuild();
        });

        it('should do nothing when shared directory does not exist', async () => {
            process.env.SHARED_STORYBOOK_DIR = '/nonexistent/path';

            // Should not throw
            await cleanupSharedStorybookBuild();
        });

        it('should remove shared directory when it exists', async () => {
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            // Create shared directory with content
            await fs.ensureDir(tempSharedDir);
            await fs.writeFile(path.join(tempSharedDir, 'test-file.txt'), 'test content');

            expect(await fs.pathExists(tempSharedDir)).toBe(true);

            await cleanupSharedStorybookBuild();

            expect(await fs.pathExists(tempSharedDir)).toBe(false);
        });

        it('should handle cleanup of complex directory structure', async () => {
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            // Create complex directory structure
            const buildPath = path.join(tempSharedDir, 'storybook-static');
            const assetsPath = path.join(buildPath, 'assets');

            await fs.ensureDir(assetsPath);
            await fs.writeFile(path.join(buildPath, 'index.html'), '<html>Test</html>');
            await fs.writeFile(path.join(assetsPath, 'app.js'), 'console.log("test");');

            const buildInfo = {
                buildPath,
                timestamp: new Date().toISOString(),
                projectPath: '/test/project',
            };

            await fs.writeJSON(path.join(tempSharedDir, 'build-info.json'), buildInfo);

            expect(await fs.pathExists(tempSharedDir)).toBe(true);
            expect(await fs.pathExists(buildPath)).toBe(true);
            expect(await fs.pathExists(assetsPath)).toBe(true);

            await cleanupSharedStorybookBuild();

            expect(await fs.pathExists(tempSharedDir)).toBe(false);
            expect(await fs.pathExists(buildPath)).toBe(false);
            expect(await fs.pathExists(assetsPath)).toBe(false);
        });
    });

    describe('Environment Variables', () => {
        it('should handle SHARED_STORYBOOK_DIR and TEMP_E2E_DIR environment variables', () => {
            const sharedDir = '/test/shared';
            const tempDir = '/test/temp';

            process.env.SHARED_STORYBOOK_DIR = sharedDir;
            process.env.TEMP_E2E_DIR = tempDir;

            expect(process.env.SHARED_STORYBOOK_DIR).toBe(sharedDir);
            expect(process.env.TEMP_E2E_DIR).toBe(tempDir);
        });

        it('should work with undefined environment variables', async () => {
            process.env.SHARED_STORYBOOK_DIR = undefined;
            process.env.TEMP_E2E_DIR = undefined;

            // Should not throw
            const result = await getSharedStorybookBuild();
            expect(result).toBeNull();

            await cleanupSharedStorybookBuild();
        });
    });

    describe('Integration with CI environment', () => {
        it('should detect CI environment variable', () => {
            process.env.CI = 'true';
            expect(process.env.CI).toBeTruthy();

            process.env.CI = undefined;
            expect(process.env.CI).toBeUndefined();
        });

        it('should handle both CI and non-CI environments', async () => {
            // Test CI environment
            process.env.CI = 'true';
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            const result1 = await getSharedStorybookBuild();
            expect(result1).toBeNull(); // No build exists yet

            // Test non-CI environment
            process.env.CI = undefined;

            const result2 = await getSharedStorybookBuild();
            expect(result2).toBeNull(); // Still no build exists
        });
    });

    describe('Error handling', () => {
        it('should handle file system errors gracefully', async () => {
            process.env.SHARED_STORYBOOK_DIR = tempSharedDir;

            // Create a file where we expect a directory
            await fs.writeFile(path.join(tempSharedDir, 'storybook-static'), 'not a directory');

            const buildInfo = {
                buildPath: path.join(tempSharedDir, 'storybook-static'),
                timestamp: new Date().toISOString(),
                projectPath: '/test/project',
            };

            await fs.writeJSON(path.join(tempSharedDir, 'build-info.json'), buildInfo);

            const result = await getSharedStorybookBuild();

            // Should handle the error gracefully and return null
            expect(result).toBeNull();
        });

        it('should handle permission errors gracefully', async () => {
            // This test simulates permission errors but in a safe way
            // by creating a scenario that would fail pathExists checks

            process.env.SHARED_STORYBOOK_DIR = '/root/.test-permission-error';

            const result = await getSharedStorybookBuild();

            // Should handle permission errors gracefully
            expect(result).toBeNull();
        });
    });
});
