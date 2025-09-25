import { test, expect } from '@playwright/test';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Generated Project Login', () => {
  const testDir = path.join('/tmp', 'fluorite-test-login');
  const projectName = 'test-login-app';
  const projectPath = path.join(testDir, projectName);

  test.beforeAll(async () => {
    // Clean up any existing test directory
    await fs.remove(testDir);
    await fs.ensureDir(testDir);

    console.log('Generating test project...');

    // Generate a project programmatically
    const fluoriteRoot = path.join(__dirname, '../..');
    const { createProject } = await import(path.join(fluoriteRoot, 'dist/index.js'));

    await createProject({
      projectName,
      projectPath,
      framework: 'nextjs',
      database: 'turso',
      orm: 'prisma',
      deployment: false,
      storage: 'none',
      auth: true,
      packageManager: 'pnpm',
    });

    console.log('Test project generated at:', projectPath);
  });

  test.afterAll(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  test('should be able to login with seeded account', async ({ page }) => {
    // Start the dev server
    console.log('Starting dev server...');
    const devProcess = execa('pnpm', ['run', 'dev'], {
      cwd: projectPath,
      env: {
        ...process.env,
        PORT: '3333',
        CI: 'true', // Prevent interactive prompts
      },
    });

    // Wait for server to be ready
    await new Promise<void>((resolve) => {
      devProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        if (output.includes('Ready in') || output.includes('started server on')) {
          resolve();
        }
      });

      devProcess.stderr?.on('data', (data) => {
        console.error('Dev server error:', data.toString());
      });

      // Timeout after 30 seconds
      setTimeout(() => resolve(), 30000);
    });

    try {
      // Navigate to login page
      await page.goto('http://localhost:3333/login');

      // Wait for the login form to be visible
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });

      // Fill in login credentials
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'Admin123!');

      // Click login button
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await page.waitForURL('http://localhost:3333/dashboard', { timeout: 10000 });

      // Verify we're on the dashboard
      expect(page.url()).toContain('/dashboard');

      // Verify user info is displayed
      await expect(page.locator('text=admin@example.com')).toBeVisible();

      console.log('✅ Login test passed!');
    } finally {
      // Kill the dev server
      devProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      devProcess.kill('SIGKILL');
    }
  });

  test('should not login with incorrect credentials', async ({ page }) => {
    // Start the dev server
    const devProcess = execa('pnpm', ['run', 'dev'], {
      cwd: projectPath,
      env: {
        ...process.env,
        PORT: '3334',
        CI: 'true',
      },
    });

    // Wait for server to be ready
    await new Promise<void>((resolve) => {
      devProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready in') || output.includes('started server on')) {
          resolve();
        }
      });
      setTimeout(() => resolve(), 30000);
    });

    try {
      // Navigate to login page
      await page.goto('http://localhost:3334/login');

      // Wait for the login form
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });

      // Fill in wrong credentials
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'WrongPassword');

      // Click login button
      await page.click('button[type="submit"]');

      // Wait for error message
      await page.waitForSelector('text=/Invalid credentials|Authentication failed/i', {
        timeout: 5000,
      });

      // Verify we're still on login page
      expect(page.url()).toContain('/login');

      console.log('✅ Invalid login test passed!');
    } finally {
      // Kill the dev server
      devProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      devProcess.kill('SIGKILL');
    }
  });
});
