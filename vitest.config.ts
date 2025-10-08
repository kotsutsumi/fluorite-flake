/**
 * Vitestテストランナーの設定ファイル
 *
 * ユニットテストと統合テストを分離したプロジェクトベースの設定を提供。
 * カバレッジレポートの生成とタイムアウト設定を含む。
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // ルート設定
        globals: true, // グローバル変数の有効化（describe, it, expect等）
        environment: "node", // Node.js環境での実行
        exclude: ["node_modules", "dist", ".temp-*"], // テスト対象外ディレクトリ
        coverage: {
            reporter: ["text", "json", "html"], // カバレッジレポート形式
            include: ["src/**/*.ts"], // カバレッジ対象ファイル
            exclude: [
                "node_modules/",
                "dist/",
                "test/",
                "*.config.ts",
                "**/*.d.ts",
                "src/cli.ts", // CLIエントリーポイント
                "src/index.ts", // ライブラリエントリーポイント
            ],
        },

        // プロジェクト設定（非推奨のworkspaceに代わる設定）
        projects: [
            {
                test: {
                    name: "unit", // ユニットテストプロジェクト
                    include: ["test/unit/**/*.test.ts"],
                    testTimeout: 10_000, // ユニットテスト用：10秒タイムアウト
                    hookTimeout: 10_000,
                    globalSetup: "./test/helpers/global-setup.ts",
                    globals: true,
                    environment: "node",
                },
            },
            {
                test: {
                    name: "integration", // 統合テストプロジェクト
                    include: ["test/integration/**/*.test.ts"],
                    testTimeout: 30_000, // 統合テスト用：30秒タイムアウト
                    hookTimeout: 30_000,
                    globalSetup: "./test/helpers/global-setup.ts",
                    globals: true,
                    environment: "node",
                },
            },
        ],
    },
});

// EOF
