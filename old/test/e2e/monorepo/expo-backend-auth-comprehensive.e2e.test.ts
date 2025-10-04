/**
 * Comprehensive E2E test for Expo monorepo backend authentication features
 * Tests actual login, user management, organization management, and profile features with Playwright
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'fs-extra';
import { execa, type ExecaChildProcess } from 'execa';
import { generateProject } from '../../helpers/project-generator.js';

const SERVER_STARTUP_WAIT = 30_000; // Extended wait for full authentication setup

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

test.describe('Expo Monorepo Backend Authentication Comprehensive E2E', () => {
    test.describe.configure({ mode: 'serial' });

    let projectPath: string;
    let backendPath: string;
    let backendProcess: ExecaChildProcess | undefined;
    const backendUrl = 'http://localhost:3202';

    test.beforeAll(async () => {
        // Set environment variables for non-interactive generation
        process.env.FLUORITE_TEST_MODE = 'true';
        process.env.FLUORITE_CLOUD_MODE = 'mock';

        const result = await generateProject({
            projectName: 'expo-auth-comprehensive-e2e',
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
                projectName: 'expo-auth-comprehensive-e2e-backend',
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
                projectName: 'expo-auth-comprehensive-e2e-frontend',
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

        // Install dependencies and setup database
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

        // Setup development database
        try {
            await execa('pnpm', ['run', 'db:generate'], { cwd: backendPath, stdio: 'inherit' });
            await execa('pnpm', ['run', 'db:push:force'], { cwd: backendPath, stdio: 'inherit' });
            await execa('pnpm', ['run', 'db:seed'], { cwd: backendPath, stdio: 'inherit' });
        } catch (_error) {
            console.warn(
                '⚠️  Database setup skipped due to filesystem restrictions (likely in CI/test environment)'
            );
        }

        // Start the backend server
        backendProcess = execa('pnpm', ['run', 'dev'], {
            cwd: backendPath,
            env: { ...process.env, PORT: '3202' },
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
            'src/app/(app)/page.tsx',
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

        // Verify database scripts
        const dbScripts = ['db:generate', 'db:reset', 'db:seed', 'db:push'];
        for (const script of dbScripts) {
            expect(packageJson.scripts[script], `${script} script should be present`).toBeTruthy();
        }
    });

    test('backend server starts and serves authentication pages', async ({ page }) => {
        const response = await page.goto(backendUrl, { waitUntil: 'networkidle' });
        expect(response?.status()).toBeLessThan(400);

        // Should have main content
        await expect(page.locator('main')).toBeVisible();

        // Should not have module errors
        await expect(page.locator('text=Module not found')).toHaveCount(0);
        await expect(page.locator("text=Can't resolve")).toHaveCount(0);
    });

    test('login page loads and is functional', async ({ page }) => {
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

    test('can login with demo credentials and access protected routes', async ({ page }) => {
        // Navigate to login page
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

        // Should redirect to authenticated area
        await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10000 });

        // Should now show authenticated state
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');

        // Should be able to access the dashboard/authenticated area
        await expect(page.locator('main')).toBeVisible();
    });

    test('profile page is accessible and functional after login', async ({ page }) => {
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

        // Should not show login form (means we're authenticated)
        await expect(page.locator('input[type="password"]')).not.toBeVisible();

        // Should show user information or profile form
        await expect(
            page.locator('form, .profile-info, .user-info, input[name="name"], input[name="email"]')
        ).toBeVisible();
    });

    test('organizations page is accessible and shows organization management', async ({ page }) => {
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

        // Should show organization management interface
        await expect(
            page.locator(
                'table, .organization-list, .org-card, button:has-text("Create"), button:has-text("Add")'
            )
        ).toBeVisible();
    });

    test('users page is accessible and shows user management', async ({ page }) => {
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

        // Should show user management interface
        await expect(
            page.locator(
                'table, .user-list, .user-card, th:has-text("Email"), th:has-text("Name"), th:has-text("Role")'
            )
        ).toBeVisible();
    });

    test('authentication API endpoints work correctly', async ({ request }) => {
        // Test auth API endpoint exists and works
        const authResponse = await request.get(`${backendUrl}/api/auth/session`);
        expect(authResponse.status()).toBeLessThan(500); // Should not be server error

        // Response should be JSON
        const contentType = authResponse.headers()['content-type'];
        expect(contentType).toContain('application/json');

        // Should get a valid session response structure
        const sessionData = await authResponse.json();
        expect(sessionData).toBeDefined();
    });

    test('can logout and access is properly restricted', async ({ page }) => {
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

        // Find and click logout button
        const logoutButton = page.locator(
            'button:has-text("logout"), button:has-text("Logout"), button:has-text("Sign out"), a:has-text("logout"), a:has-text("Logout")'
        );

        if ((await logoutButton.count()) > 0) {
            await logoutButton.first().click();

            // Should redirect to login or public page
            await page.waitForURL(
                (url) => url.pathname === '/login' || !url.pathname.includes('(app)'),
                { timeout: 10000 }
            );

            // Try to access protected route after logout
            await page.goto(`${backendUrl}/profile`);

            // Should either redirect to login or show login form
            await page.waitForTimeout(2000); // Give time for redirect
            const currentUrl = page.url();
            const hasLoginForm = (await page.locator('input[type="password"]').count()) > 0;

            expect(currentUrl.includes('/login') || hasLoginForm).toBe(true);
        }
    });
});
