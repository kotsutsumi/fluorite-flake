import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 120000, // 2 minutes for generator tests
        hookTimeout: 120000,
        include: ['test/**/*.test.ts'],
        exclude: ['test/e2e/**', 'node_modules', 'dist'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'dist/', 'test/', '*.config.ts', 'test/e2e/**'],
        },
    },
});
