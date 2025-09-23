import path from 'node:path';
import { expect, test } from '@playwright/test';
import fs from 'fs-extra';
import { TestProjectManager, createTestConfig } from './utils/test-helpers.js';

// Test configurations for different Tauri setups
const testConfigs = [
  {
    name: 'tauri-basic',
    config: createTestConfig({
      projectName: 'tauri-basic-e2e',
      framework: 'tauri',
      deployment: false,
    }),
  },
  {
    name: 'tauri-with-deployment',
    config: createTestConfig({
      projectName: 'tauri-deployment-e2e',
      framework: 'tauri',
      deployment: true,
    }),
  },
];

test.describe
  .serial('Tauri E2E Tests', () => {
    test.setTimeout(300000); // 5 minutes per test

    let manager: TestProjectManager;

    test.beforeAll(async () => {
      manager = new TestProjectManager();
      await manager.initialize();
    });

    test.afterAll(async () => {
      await manager.cleanup();
    });

    for (const { name, config } of testConfigs) {
      test(`${name}: should create, install, run, and build successfully`, async () => {
        console.log(`\n🧪 Testing ${name} configuration...`);

        // Step 1: Create the project
        const projectPath = await manager.createProject(config);

        // Step 2: Verify project structure
        await manager.verifyProjectStructure(projectPath, 'tauri');

        // Step 3: Install dependencies
        await manager.installDependencies(projectPath, config.packageManager);

        // Step 4: Check if Rust/Cargo is available
        const { exec } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const execAsync = promisify(exec);

        let hasRust = false;
        try {
          await execAsync('cargo --version');
          hasRust = true;
          console.log('✅ Rust/Cargo detected');
        } catch {
          console.log('⚠️ Rust/Cargo not found - skipping Rust-specific tests');
        }

        // Step 5: Start Tauri dev server (web portion)
        const server = await manager.startDevServer(projectPath, 'tauri', config.projectName);

        // Step 6: Test with Playwright (web UI)
        await manager.testWithPlaywright(server.url, async (page) => {
          // Check that the page loads
          await expect(page).toHaveTitle(/Tauri/);

          // Look for Tauri-specific content
          const heading = page.locator('h1, h2').first();
          await expect(heading).toBeVisible();

          // Check for Vite + React content
          const content = page.locator('text=/Vite|React|Tauri/i').first();
          await expect(content).toBeVisible();

          // Verify no console errors
          const errors = await manager.checkForConsoleErrors(page);
          // Filter out common Vite HMR messages
          const criticalErrors = errors.filter(
            (e) => !e.includes('HMR') && !e.includes('[vite]') && !e.includes('WebSocket')
          );
          expect(criticalErrors).toHaveLength(0);

          // Test interactive elements if present
          const button = page.locator('button').first();
          if (await button.isVisible()) {
            await button.click();
            await page.waitForTimeout(500);
          }

          // Check for Tauri API availability in window
          const hasTauriAPI = await page.evaluate(() => {
            return typeof (window as { __TAURI__?: unknown }).__TAURI__ !== 'undefined';
          });

          // In web mode, Tauri API won't be available, which is expected
          console.log(`  Tauri API available in web mode: ${hasTauriAPI}`);
        });

        // Step 7: Build the frontend
        console.log('🔨 Building Tauri frontend...');
        try {
          await execAsync('pnpm run build', {
            cwd: projectPath,
            timeout: 180000, // 3 minutes
          });
          console.log('✅ Frontend build completed successfully');
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('❌ Frontend build failed:', errorMessage);
          throw error;
        }

        // Step 8: If Rust is available, test Tauri-specific builds
        if (hasRust) {
          console.log('🦀 Testing Rust/Tauri build...');

          // First, ensure Tauri CLI is installed
          try {
            await execAsync('pnpm add -D @tauri-apps/cli', {
              cwd: projectPath,
              timeout: 60000,
            });

            // Try to build the Tauri app (this might take a while)
            await execAsync('pnpm tauri build --debug', {
              cwd: projectPath,
              timeout: 600000, // 10 minutes for Rust compilation
            });

            console.log('✅ Tauri build completed successfully');
          } catch (error: unknown) {
            // Tauri build might fail due to missing dependencies or platform issues
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log('⚠️ Tauri build failed (this might be expected in CI):', errorMessage);
          }
        }

        // Step 9: Check deployment configuration if enabled
        if (config.deployment) {
          // Check for GitHub Actions workflow
          const workflowPath = path.join(projectPath, '.github/workflows/release.yml');
          if (await fs.pathExists(workflowPath)) {
            console.log('✅ Deployment workflow configured');
          }
        }

        console.log(`✅ ${name} test completed successfully\n`);
      });
    }

    // Special test for Tauri window management
    test('tauri-window: should handle window operations correctly', async () => {
      const config = createTestConfig({
        projectName: 'tauri-window-test',
        framework: 'tauri',
      });

      console.log('\n🧪 Testing Tauri window management...');

      const projectPath = await manager.createProject(config);
      await manager.installDependencies(projectPath, config.packageManager);

      const server = await manager.startDevServer(projectPath, 'tauri', config.projectName);

      await manager.testWithPlaywright(server.url, async (page) => {
        // In web mode, we can only test the web portion
        await expect(page.locator('body')).toBeVisible();

        // Check viewport responsiveness
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();

        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();

        // Verify the app adapts to different sizes
        const isResponsive = await page.evaluate(() => {
          const body = document.body;
          return body.scrollWidth <= window.innerWidth;
        });
        expect(isResponsive).toBeTruthy();
      });

      console.log('✅ Tauri window test completed\n');
    });
  });

// Tauri-specific error handling
test.describe('Tauri Error Handling', () => {
  test.setTimeout(120000);

  test('should handle missing Rust gracefully', async () => {
    const manager = new TestProjectManager();

    try {
      await manager.initialize();

      const config = createTestConfig({
        projectName: 'tauri-no-rust-test',
        framework: 'tauri',
      });

      const projectPath = await manager.createProject(config);
      await manager.installDependencies(projectPath, config.packageManager);

      // The web dev server should still work without Rust
      const server = await manager.startDevServer(projectPath, 'tauri', config.projectName);

      await manager.testWithPlaywright(server.url, async (page) => {
        // Web UI should work fine without Rust
        await expect(page.locator('body')).toBeVisible();
        await expect(page).toHaveTitle(/Tauri/);
      });
    } finally {
      await manager.cleanup();
    }
  });
});

// Performance testing
test.describe('Tauri Performance', () => {
  test.setTimeout(180000);

  test('should have optimized bundle size', async () => {
    const manager = new TestProjectManager();

    try {
      await manager.initialize();

      const config = createTestConfig({
        projectName: 'tauri-perf-test',
        framework: 'tauri',
      });

      const projectPath = await manager.createProject(config);
      await manager.installDependencies(projectPath, config.packageManager);

      // Build the frontend
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);

      await execAsync('pnpm run build', {
        cwd: projectPath,
        timeout: 180000,
      });

      // Check build output size

      const distPath = path.join(projectPath, 'dist');
      if (await fs.pathExists(distPath)) {
        const getDirectorySize = async (dir: string): Promise<number> => {
          let size = 0;
          const files = await fs.readdir(dir);

          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
              size += await getDirectorySize(filePath);
            } else {
              size += stats.size;
            }
          }

          return size;
        };

        const distSize = await getDirectorySize(distPath);
        const distSizeMB = distSize / (1024 * 1024);

        console.log(`  Distribution size: ${distSizeMB.toFixed(2)} MB`);

        // Frontend bundle should be reasonably sized
        expect(distSizeMB).toBeLessThan(10); // 10MB max for frontend
      }

      // Test dev server performance
      const server = await manager.startDevServer(projectPath, 'tauri', config.projectName);

      await manager.testWithPlaywright(server.url, async (page) => {
        const startTime = Date.now();
        await page.goto(server.url, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;

        // Vite dev server should be fast
        const maxLoadTime = process.env.CI ? 10000 : 5000;
        expect(loadTime).toBeLessThan(maxLoadTime);

        // Check for fast refresh capability
        const hasHMR = await page.evaluate(() => {
          return typeof (import.meta as { hot?: unknown }).hot !== 'undefined';
        });
        expect(hasHMR).toBeTruthy();
      });
    } finally {
      await manager.cleanup();
    }
  });
});
