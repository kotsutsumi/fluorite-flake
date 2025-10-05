/**
 * E2Eテスト用Vitest設定
 */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // E2Eテスト専用の設定
        name: "e2e",
        include: ["test/e2e/**/*.test.ts"],
        exclude: [
            "test/unit/**",
            "test/functional/**",
            "test/scenario/**",
            "**/node_modules/**",
            "**/dist/**",
        ],

        // タイムアウト設定
        testTimeout: 60_000, // 1分（プロジェクト生成等の時間のかかるテスト用）
        hookTimeout: 30_000, // 30秒（setup/teardown用）

        // 並行実行設定
        pool: "threads",
        poolOptions: {
            threads: {
                minThreads: 1,
                maxThreads: process.env.CI ? 2 : 4, // CIでは並行数を抑制
                isolate: true,
            },
        },

        // リトライ設定
        retry: process.env.CI ? 2 : 0, // CIでのみリトライ

        // レポーター設定
        reporter: process.env.CI
            ? ["verbose", "junit", "github-actions"]
            : ["verbose", "html"],

        outputFile: {
            junit: "test/e2e/reports/junit.xml",
            html: "test/e2e/reports/index.html",
        },

        // カバレッジ設定（E2Eでは無効化）
        coverage: {
            enabled: false,
        },

        // グローバル設定
        globals: true,
        environment: "node",

        // セットアップファイル
        setupFiles: ["test/e2e/setup/global-setup.ts"],
        globalSetup: ["test/e2e/setup/global-setup.ts"],
        globalTeardown: ["test/e2e/setup/global-teardown.ts"],

        // ファイル変更監視（開発時）
        watch: false, // E2Eでは基本的にwatchモードは使わない

        // 環境変数
        env: {
            NODE_ENV: "test",
            FLUORITE_LOCALE: "ja",
            E2E_TEST: "true",
        },
    },

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "@test": path.resolve(__dirname, "test"),
        },
    },

    esbuild: {
        target: "node18",
    },
});

// EOF
