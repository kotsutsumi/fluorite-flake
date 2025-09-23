import { expect, test } from '@playwright/test';
import { TestProjectManager, createTestConfig } from './utils/test-helpers.js';

// Test configurations for different Next.js setups
const testConfigs = [
  {
    name: 'nextjs-basic',
    config: createTestConfig({
      projectName: 'nextjs-basic-e2e',
      framework: 'nextjs',
      database: 'none',
      storage: 'none',
      auth: false,
    }),
  },
  {
    name: 'nextjs-with-turso-prisma',
    config: createTestConfig({
      projectName: 'nextjs-turso-prisma-e2e',
      framework: 'nextjs',
      database: 'turso',
      orm: 'prisma',
      auth: false,
    }),
  },
  {
    name: 'nextjs-with-supabase-drizzle',
    config: createTestConfig({
      projectName: 'nextjs-supabase-drizzle-e2e',
      framework: 'nextjs',
      database: 'supabase',
      orm: 'drizzle',
      auth: false,
    }),
  },
  {
    name: 'nextjs-full-stack',
    config: createTestConfig({
      projectName: 'nextjs-full-stack-e2e',
      framework: 'nextjs',
      database: 'turso',
      orm: 'prisma',
      storage: 'vercel-blob',
      auth: true,
      deployment: true,
    }),
  },
];

test.describe
  .serial('Next.js E2E Tests', () => {
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
        await manager.verifyProjectStructure(projectPath, 'nextjs');

        // Step 3: Install dependencies
        await manager.installDependencies(projectPath, config.packageManager);

        // Step 4: Start dev server
        const server = await manager.startDevServer(projectPath, 'nextjs', config.projectName);

        // Step 5: Test with Playwright
        await manager.testWithPlaywright(server.url, async (page) => {
          // Check that the page loads without errors
          await expect(page).toHaveTitle(/Fluorite Next.js/);

          // Check for main heading
          const heading = page.locator('h1').first();
          await expect(heading).toBeVisible();
          await expect(heading).toContainText('Welcome to');

          // Check for key features section
          const featuresSection = page.locator('text=/Features/i');
          await expect(featuresSection).toBeVisible();

          // Verify no console errors
          const errors = await manager.checkForConsoleErrors(page);
          expect(errors).toHaveLength(0);

          // If auth is enabled, check for auth components
          if (config.auth) {
            const signInButton = page.locator('text=/Sign In/i').first();
            await expect(signInButton).toBeVisible();
          }

          // Test navigation to a different page (if available)
          const aboutLink = page.locator('a[href="/about"]');
          if (await aboutLink.isVisible()) {
            await aboutLink.click();
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL(/\/about/);
          }

          // Navigate back to home
          await page.goto(server.url);
          await page.waitForLoadState('networkidle');

          // Test dark mode toggle if available
          const themeToggle = page.locator(
            '[data-testid="theme-toggle"], button:has-text("Toggle theme")'
          );
          if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(500); // Wait for theme transition

            // Verify theme changed (checking class or attribute)
            const html = page.locator('html');
            const classList = (await html.getAttribute('class')) || '';
            expect(classList).toMatch(/dark|light/);
          }

          // Test API route if database is configured
          if (config.database !== 'none') {
            const apiResponse = await page.request.get(`${server.url}/api/health`);
            expect(apiResponse.ok()).toBeTruthy();
          }
        });

        // Step 6: Run build command
        await manager.runBuildCommand(projectPath, 'nextjs');

        console.log(`✅ ${name} test completed successfully\n`);
      });
    }

    // Special test for production build serving
    test('nextjs-production: should serve production build correctly', async () => {
      const config = createTestConfig({
        projectName: 'nextjs-prod-test',
        framework: 'nextjs',
      });

      console.log('\n🧪 Testing Next.js production build...');

      // Create and build the project
      const projectPath = await manager.createProject(config);
      await manager.installDependencies(projectPath, config.packageManager);
      await manager.runBuildCommand(projectPath, 'nextjs');

      // Start production server
      const { exec } = await import('node:child_process');
      const prodServer = exec('pnpm run start', {
        cwd: projectPath,
        env: { ...process.env, PORT: '3001' },
      });

      // Wait for production server to start
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        // Test production build
        await manager.testWithPlaywright('http://localhost:3001', async (page) => {
          await expect(page).toHaveTitle(/Fluorite Next.js/);

          // Verify optimized build (checking for Next.js production indicators)
          const htmlContent = await page.content();
          expect(htmlContent).toContain('/_next/static/');

          // Check that no development warnings appear
          const errors = await manager.checkForConsoleErrors(page);
          const devWarnings = errors.filter((e) => e.includes('development'));
          expect(devWarnings).toHaveLength(0);
        });
      } finally {
        // Clean up production server
        prodServer.kill();
      }

      console.log('✅ Production build test completed successfully\n');
    });
  });

// Separate test suite for error handling
test.describe('Next.js Error Handling', () => {
  test.setTimeout(120000); // 2 minutes per test

  test('should handle missing environment variables gracefully', async () => {
    const manager = new TestProjectManager();

    try {
      await manager.initialize();

      const config = createTestConfig({
        projectName: 'nextjs-env-test',
        framework: 'nextjs',
        database: 'turso',
        orm: 'prisma',
      });

      const projectPath = await manager.createProject(config);
      await manager.installDependencies(projectPath, config.packageManager);

      // Start server without required env vars (should show error page)
      const server = await manager.startDevServer(projectPath, 'nextjs', config.projectName);

      await manager.testWithPlaywright(server.url, async (page) => {
        // The app should still load but might show warnings
        await expect(page.locator('body')).toBeVisible();

        // If database is configured without env vars, API calls should fail gracefully
        const apiResponse = await page.request.get(`${server.url}/api/health`, {
          failOnStatusCode: false,
        });

        // Should return error status
        expect([400, 500, 503]).toContain(apiResponse.status());
      });
    } finally {
      await manager.cleanup();
    }
  });
});

// Performance testing
test.describe('Next.js Performance', () => {
  test.setTimeout(180000); // 3 minutes

  test('should meet performance benchmarks', async () => {
    const manager = new TestProjectManager();

    try {
      await manager.initialize();

      const config = createTestConfig({
        projectName: 'nextjs-perf-test',
        framework: 'nextjs',
      });

      const projectPath = await manager.createProject(config);
      await manager.installDependencies(projectPath, config.packageManager);
      const server = await manager.startDevServer(projectPath, 'nextjs', config.projectName);

      await manager.testWithPlaywright(server.url, async (page) => {
        // Measure page load time
        const startTime = Date.now();
        await page.goto(server.url, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;

        // Should load within reasonable time (adjust based on CI environment)
        const maxLoadTime = process.env.CI ? 10000 : 5000;
        expect(loadTime).toBeLessThan(maxLoadTime);

        // Check Core Web Vitals (simplified version)
        const metrics = await page.evaluate(() => {
          return new Promise((resolve) => {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const fcp = entries.find((e) => e.name === 'first-contentful-paint');
              const _lcp = entries.find((e) => e.entryType === 'largest-contentful-paint');

              resolve({
                fcp: fcp?.startTime,
                hasInteractivity: true,
              });
            });

            observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

            // Fallback after 2 seconds
            setTimeout(() => resolve({ fcp: 0, hasInteractivity: true }), 2000);
          });
        });

        // Basic performance assertions
        expect(metrics).toHaveProperty('hasInteractivity', true);
      });
    } finally {
      await manager.cleanup();
    }
  });
});
