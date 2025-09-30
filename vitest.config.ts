import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Root configuration
        globals: true,
        environment: 'node',
        exclude: ['node_modules', 'dist', '.temp-*'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'node_modules/',
                'dist/',
                'test/',
                '*.config.ts',
                '**/*.d.ts',
                'src/cli.ts', // CLI entry point
                'src/index.ts', // Library entry point
            ],
        },

        // Projects configuration (replaces deprecated workspace)
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['test/unit/**/*.test.ts'],
                    testTimeout: 10000, // 10 seconds for unit tests
                    hookTimeout: 10000,
                    globalSetup: './test/helpers/global-setup.ts',
                    globals: true,
                    environment: 'node',
                },
            },
            {
                test: {
                    name: 'functional',
                    include: ['test/functional/**/*.test.ts'],
                    testTimeout: 30000, // 30 seconds for functional tests
                    hookTimeout: 30000,
                    globalSetup: './test/helpers/global-setup.ts',
                    globals: true,
                    environment: 'node',
                },
            },
            {
                test: {
                    name: 'scenario',
                    include: ['test/scenario/**/*.test.ts'],
                    // Flutter/Tauri のシナリオテストは一時停止する
                    exclude: [
                        'test/scenario/flutter/**/*.test.ts',
                        'test/scenario/tauri/**/*.test.ts',
                    ],
                    testTimeout: 300000, // 5 minutes for scenario tests
                    hookTimeout: 300000,
                    maxConcurrency: 1, // Run scenario tests sequentially
                    pool: 'threads', // Use single threaded execution
                    poolOptions: {
                        threads: {
                            maxThreads: 1, // Force single thread
                            minThreads: 1,
                        },
                    },
                    globalSetup: './test/helpers/global-setup.ts',
                    globals: true,
                    environment: 'node',
                    sequence: {
                        concurrent: false, // Disable concurrent execution
                        shuffle: false, // Run tests in order
                    },
                },
            },
        ],
    },
});
