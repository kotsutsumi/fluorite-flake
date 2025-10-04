/**
 * Comprehensive E2E test for monorepo backend authentication features
 * Tests login, user management, organization management, and profile features
 */

import path from 'node:path';
import { expect, test } from '@playwright/test';
import { type ExecaChildProcess, execa } from 'execa';
import fs from 'fs-extra';
import { generateProject } from '../../helpers/project-generator.js';

const SERVER_STARTUP_WAIT = 25_000; // Extended wait for authentication setup

async function renameTemplateFiles(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await renameTemplateFiles(fullPath);
            continue;
        }
        if (entry.name.endsWith('.template')) {
            const renamedPath = fullPath.replace(/\.template$/, '');
            await fs.rename(fullPath, renamedPath);
        }
    }
}

test.describe('Monorepo Backend Authentication Features E2E', () => {
    test.describe.configure({ mode: 'serial' });

    let projectPath: string;
    let backendPath: string;
    let backendProcess: ExecaChildProcess | undefined;
    const backendUrl = 'http://localhost:3201';

    test.beforeAll(async () => {
        const result = await generateProject({
            projectName: 'monorepo-auth-features-e2e',
            framework: 'expo',
            database: 'turso',
            orm: 'prisma',
            storage: 'vercel-blob',
            auth: true,
            packageManager: 'pnpm',
            isMonorepo: true,
            workspaceTool: 'turborepo',
            includeBackend: true,
            frontendFramework: 'expo',
            deployment: false,
            backendConfig: {
                projectName: 'monorepo-auth-features-e2e-backend',
                projectPath: '',
                framework: 'nextjs',
                database: 'turso',
                orm: 'prisma',
                deployment: false,
                storage: 'vercel-blob',
                auth: true,
                packageManager: 'pnpm',
                mode: 'full',
                isMonorepoChild: true,
            },
            frontendConfig: {
                projectName: 'monorepo-auth-features-e2e-frontend',
                projectPath: '',
                framework: 'expo',
                database: 'turso',
                orm: 'prisma',
                deployment: false,
                storage: 'vercel-blob',
                auth: true,
                packageManager: 'pnpm',
                mode: 'full',
                isMonorepoChild: true,
            },
        });

        projectPath = result.projectPath;
        backendPath =
            result.config.backendConfig?.projectPath ?? path.join(projectPath, 'apps', 'backend');

        await execa('pnpm', ['install'], { cwd: projectPath, stdio: 'inherit' });
        await renameTemplateFiles(path.join(backendPath, 'src'));

        if (!(await fs.pathExists(backendPath))) {
            const rootEntries = await fs.readdir(projectPath);
            const appsRoot = path.join(projectPath, 'apps');
            const appsEntries = (await fs.pathExists(appsRoot)) ? await fs.readdir(appsRoot) : [];
            throw new Error(
                `backend path not found: ${backendPath}. entries=${rootEntries.join(', ')}, apps=${appsEntries.join(', ')}`
            );
        }

        // Setup development database (skip in CI/test environment to avoid read-only filesystem issues)
        try {
            await execa('pnpm', ['run', 'db:generate'], { cwd: backendPath, stdio: 'inherit' });
            await execa('pnpm', ['run', 'db:push:force'], { cwd: backendPath, stdio: 'inherit' });
            await execa('pnpm', ['run', 'db:seed'], { cwd: backendPath, stdio: 'inherit' });
        } catch (_error) {
            console.warn(
                '⚠️  Database setup skipped due to filesystem restrictions (likely in CI/test environment)'
            );
        }

        backendProcess = execa('pnpm', ['run', 'dev'], {
            cwd: backendPath,
            env: { ...process.env, PORT: '3201' },
        });

        await new Promise((resolve) => setTimeout(resolve, SERVER_STARTUP_WAIT));
    });

    test.afterAll(async () => {
        if (backendProcess) {
            backendProcess.kill('SIGTERM');
            await new Promise((resolve) => setTimeout(resolve, 2_000));
        }

        if (projectPath && (await fs.pathExists(projectPath))) {
            await fs.remove(projectPath);
        }
    });

    test('authentication files are generated correctly', async () => {
        // Verify all authentication files exist
        const authFiles = [
            'src/lib/auth-client.ts',
            'src/lib/auth-server.ts',
            'src/app/api/auth/[...all]/route.ts',
            'src/app/login/page.tsx',
            'src/app/(app)/profile/page.tsx',
            'src/app/(app)/organizations/page.tsx',
            'src/app/(app)/users/page.tsx',
        ];

        for (const file of authFiles) {
            const fullPath = path.join(backendPath, file);
            expect(await fs.pathExists(fullPath), `${file} should exist`).toBe(true);
        }

        // Verify authentication dependencies
        const packageJsonPath = path.join(backendPath, 'package.json');
        const packageJson = await fs.readJSON(packageJsonPath);
        expect(
            packageJson.dependencies['better-auth'],
            'better-auth dependency should be present'
        ).toBeTruthy();
    });

    test('homepage loads with authentication UI', async ({ page }) => {
        const response = await page.goto(backendUrl, { waitUntil: 'networkidle' });
        expect(response?.status()).toBeLessThan(400);

        // Should have main content
        await expect(page.locator('main')).toBeVisible();

        // Should not have module errors
        await expect(page.locator('text=Module not found')).toHaveCount(0);
        await expect(page.locator("text=Can't resolve")).toHaveCount(0);

        // Should have navigation or login functionality
        const loginLink = page.locator(
            'a[href*="login"], button:has-text("login"), button:has-text("Login")'
        );
        const profileLink = page.locator(
            'a[href*="profile"], button:has-text("profile"), button:has-text("Profile")'
        );

        // Either login or profile should be visible (depending on auth state)
        const hasAuthUI = (await loginLink.count()) > 0 || (await profileLink.count()) > 0;
        expect(hasAuthUI, 'Should have authentication UI elements').toBe(true);
    });

    test('login page is accessible and functional', async ({ page }) => {
        await page.goto(`${backendUrl}/login`);

        // Should have login form
        await expect(page.locator('form')).toBeVisible();

        // Should have email and password fields
        const emailField = page.locator(
            'input[type="email"], input[name="email"], input[placeholder*="email" i]'
        );
        const passwordField = page.locator(
            'input[type="password"], input[name="password"], input[placeholder*="password" i]'
        );

        await expect(emailField).toBeVisible();
        await expect(passwordField).toBeVisible();

        // Should have submit button
        const submitButton = page.locator(
            'button[type="submit"], button:has-text("login"), button:has-text("Login"), button:has-text("Sign in")'
        );
        await expect(submitButton).toBeVisible();
    });

    test('can login with demo credentials', async ({ page }) => {
        await page.goto(`${backendUrl}/login`);

        // Fill login form with seeded demo credentials
        const emailField = page
            .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
            .first();
        const passwordField = page
            .locator(
                'input[type="password"], input[name="password"], input[placeholder*="password" i]'
            )
            .first();

        await emailField.fill('admin@example.com');
        await passwordField.fill('Admin123!');

        // Submit form
        const submitButton = page
            .locator(
                'button[type="submit"], button:has-text("login"), button:has-text("Login"), button:has-text("Sign in")'
            )
            .first();
        await submitButton.click();

        // Should redirect to dashboard or protected area
        await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });

        // Should now show authenticated state
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
    });

    test('profile page is accessible after login', async ({ page }) => {
        // Login first
        await page.goto(`${backendUrl}/login`);
        const emailField = page
            .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
            .first();
        const passwordField = page
            .locator(
                'input[type="password"], input[name="password"], input[placeholder*="password" i]'
            )
            .first();

        await emailField.fill('admin@example.com');
        await passwordField.fill('Admin123!');

        const submitButton = page
            .locator(
                'button[type="submit"], button:has-text("login"), button:has-text("Login"), button:has-text("Sign in")'
            )
            .first();
        await submitButton.click();

        await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });

        // Navigate to profile page
        await page.goto(`${backendUrl}/profile`);

        // Should show profile content
        await expect(
            page.locator(
                'main, [data-testid="profile"], h1:has-text("Profile"), h2:has-text("Profile")'
            )
        ).toBeVisible();

        // Should not show login form
        await expect(page.locator('input[type="password"]')).not.toBeVisible();
    });

    test('organizations page is accessible after login', async ({ page }) => {
        // Login first
        await page.goto(`${backendUrl}/login`);
        const emailField = page
            .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
            .first();
        const passwordField = page
            .locator(
                'input[type="password"], input[name="password"], input[placeholder*="password" i]'
            )
            .first();

        await emailField.fill('admin@example.com');
        await passwordField.fill('Admin123!');

        const submitButton = page
            .locator(
                'button[type="submit"], button:has-text("login"), button:has-text("Login"), button:has-text("Sign in")'
            )
            .first();
        await submitButton.click();

        await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });

        // Navigate to organizations page
        await page.goto(`${backendUrl}/organizations`);

        // Should show organizations content
        await expect(
            page.locator(
                'main, [data-testid="organizations"], h1:has-text("Organization"), h2:has-text("Organization")'
            )
        ).toBeVisible();
    });

    test('users page is accessible after login', async ({ page }) => {
        // Login first
        await page.goto(`${backendUrl}/login`);
        const emailField = page
            .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
            .first();
        const passwordField = page
            .locator(
                'input[type="password"], input[name="password"], input[placeholder*="password" i]'
            )
            .first();

        await emailField.fill('admin@example.com');
        await passwordField.fill('Admin123!');

        const submitButton = page
            .locator(
                'button[type="submit"], button:has-text("login"), button:has-text("Login"), button:has-text("Sign in")'
            )
            .first();
        await submitButton.click();

        await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });

        // Navigate to users page
        await page.goto(`${backendUrl}/users`);

        // Should show users content
        await expect(
            page.locator('main, [data-testid="users"], h1:has-text("Users"), h2:has-text("Users")')
        ).toBeVisible();
    });

    test('authentication API endpoints work correctly', async ({ request }) => {
        // Test auth API endpoint exists
        const authResponse = await request.get(`${backendUrl}/api/auth/session`);
        expect(authResponse.status()).toBeLessThan(500); // Should not be server error

        // Response should be JSON
        const contentType = authResponse.headers()['content-type'];
        expect(contentType).toContain('application/json');
    });
});
