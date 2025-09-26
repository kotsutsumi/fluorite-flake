import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './test/e2e',
    // Increase timeout for comprehensive E2E tests
    timeout: process.env.CI ? 600000 : 300000, // 10 min in CI, 5 min locally
    fullyParallel: !!process.env.CI, // Parallel in CI, serial locally
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0, // Retry twice in CI
    workers: process.env.CI ? 2 : 1, // Multiple workers in CI for sharing optimization
    reporter: process.env.CI
        ? [['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }], ['list']]
        : [['html', { open: 'never' }], ['list']],
    use: {
        // Capture more debugging info
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: process.env.CI ? 'retain-on-failure' : 'off',
        // Increase action timeout
        actionTimeout: 30000,
        navigationTimeout: 60000,
    },
    projects: [
        {
            name: 'nextjs-e2e',
            testMatch: '**/nextjs.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                // Custom context options for Next.js tests
                ignoreHTTPSErrors: true,
                viewport: { width: 1280, height: 720 },
            },
        },
        {
            name: 'storybook-e2e',
            testMatch: '**/storybook.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                // Custom context options for Storybook tests
                ignoreHTTPSErrors: true,
                viewport: { width: 1280, height: 720 },
            },
        },
        {
            name: 'expo-e2e',
            testMatch: '**/expo.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                // Custom options for Expo web tests
                ignoreHTTPSErrors: true,
                viewport: { width: 375, height: 812 }, // iPhone-like viewport
            },
        },
        {
            name: 'tauri-e2e',
            testMatch: '**/tauri.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                // Custom options for Tauri web tests
                ignoreHTTPSErrors: true,
                viewport: { width: 1024, height: 768 },
            },
        },
        {
            name: 'flutter-e2e',
            testMatch: '**/flutter.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                // Custom options for Flutter web tests
                ignoreHTTPSErrors: true,
                viewport: { width: 1280, height: 720 },
            },
        },
        // Quick smoke tests for CI
        {
            name: 'smoke-tests',
            testMatch: '**/*.spec.ts',
            use: {
                ...devices['Desktop Chrome'],
                // Run only tests tagged with @smoke
                grep: /@smoke/,
            },
        },
    ],
    // Output configuration
    outputDir: 'test-results/',
    // Global setup/teardown
    globalSetup: process.env.CI ? './test/e2e/global-setup-storybook.ts' : undefined,
    globalTeardown: process.env.CI ? './test/e2e/global-teardown-storybook.ts' : undefined,
});
