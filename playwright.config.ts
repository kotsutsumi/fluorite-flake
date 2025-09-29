import { defineConfig, devices } from '@playwright/test';

const _isCi = !!process.env.CI;

export default defineConfig({
    testDir: './test/e2e',
    fullyParallel: false,
    workers: 1,
    timeout: 120_000, // 2 minutes per test to allow for Next.js compilation
    expect: {
        timeout: 15_000,
    },
    reporter: [['list']],
    use: {
        headless: true, // Always run headless for faster execution
        trace: 'on-first-retry',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'nextjs-turso-prisma',
            testMatch: 'nextjs/**/*.e2e.test.ts',
            grep: /@turso/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'nextjs-supabase-prisma',
            testMatch: 'nextjs/**/*.e2e.test.ts',
            grep: /@supabase/,
            use: { ...devices['Desktop Chrome'] },
            metadata: {
                requiresSupabase: true,
            },
        },
    ],
});
