/**
 * CLI基本機能E2Eテスト
 */
import { describe, test } from "vitest";

import {
    assertCLIResult,
    assertErrorHandling,
    assertI18n,
} from "../../helpers/assertions.js";
import { runCLI } from "../../helpers/cli-runner.js";
import {
    ERROR_TEST_CASES,
    I18N_CONFIG,
    PERFORMANCE_THRESHOLDS,
} from "../../setup/test-config.js";

describe("CLI基本機能 E2E テスト", () => {
    describe("ヘルプコマンド", () => {
        test("--help でヘルプが表示される", async () => {
            const result = await runCLI(["--help"], {
                timeout: PERFORMANCE_THRESHOLDS.CLI.HELP,
            });

            assertCLIResult.all(result, {
                exitCode: 0,
                containsOutput: ["使用方法", "コマンド", "create", "dashboard"],
                maxDuration: PERFORMANCE_THRESHOLDS.CLI.HELP,
            });

            // 日本語メッセージの確認
            assertI18n.localeSpecificMessage(
                result,
                "ja",
                I18N_CONFIG.TEST_PATTERNS.ja.HELP_MESSAGE
            );
        });

        test("-h でヘルプが表示される", async () => {
            const result = await runCLI(["-h"]);

            assertCLIResult.success(result);
            assertCLIResult.containsOutput(result, "使用方法");
        });

        test("引数なしでヘルプが表示される", async () => {
            const result = await runCLI([]);

            assertCLIResult.success(result);
            assertCLIResult.containsOutput(result, "使用方法");
        });

        test("create コマンドのヘルプが表示される", async () => {
            const result = await runCLI(["create", "--help"]);

            assertCLIResult.success(result);
            assertCLIResult.containsOutput(result, "プロジェクト");
            assertCLIResult.containsOutput(result, "--type");
            assertCLIResult.containsOutput(result, "--typescript");
        });

        test("dashboard コマンドのヘルプが表示される", async () => {
            const result = await runCLI(["dashboard", "--help"]);

            assertCLIResult.success(result);
            assertCLIResult.containsOutput(result, "ダッシュボード");
            assertCLIResult.containsOutput(result, "--service");
        });
    });

    describe("バージョンコマンド", () => {
        test("--version でバージョンが表示される", async () => {
            const result = await runCLI(["--version"], {
                timeout: PERFORMANCE_THRESHOLDS.CLI.VERSION,
            });

            assertCLIResult.all(result, {
                exitCode: 0,
                maxDuration: PERFORMANCE_THRESHOLDS.CLI.VERSION,
            });

            // バージョン番号の形式をチェック（例: 0.5.0）
            expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
        });

        test("-v でバージョンが表示される", async () => {
            const result = await runCLI(["-v"]);

            assertCLIResult.success(result);
            expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
        });
    });

    describe("エラーハンドリング", () => {
        test("存在しないコマンドで適切なエラーメッセージを表示", async () => {
            for (const invalidCommand of ERROR_TEST_CASES.INVALID_COMMANDS) {
                const result = await runCLI([invalidCommand]);

                assertErrorHandling.appropriateErrorMessage(
                    result,
                    `invalid command: ${invalidCommand}`
                );
                assertI18n.localeSpecificMessage(
                    result,
                    "ja",
                    I18N_CONFIG.TEST_PATTERNS.ja.ERROR_MESSAGE
                );
            }
        });

        test("無効な引数で適切なエラーメッセージを表示", async () => {
            for (const invalidArgs of ERROR_TEST_CASES.INVALID_ARGUMENTS) {
                const result = await runCLI(invalidArgs);

                assertErrorHandling.appropriateErrorMessage(
                    result,
                    `invalid arguments: ${invalidArgs.join(" ")}`
                );
            }
        });

        test("エラーメッセージが日本語で表示される", async () => {
            const result = await runCLI(["invalid-command"]);

            assertCLIResult.failure(result);
            assertI18n.containsLanguage(result.stderr, "ja");
        });

        test("グレースフルなエラーハンドリング", async () => {
            const result = await runCLI([
                "create",
                "test",
                "--type",
                "invalid-type",
            ]);

            assertErrorHandling.gracefulFailure(result);
        });
    });

    describe("国際化", () => {
        test("日本語ロケールでメッセージが日本語表示", async () => {
            const result = await runCLI(["--help"], {
                env: { FLUORITE_LOCALE: "ja" },
            });

            assertCLIResult.success(result);
            assertI18n.localeSpecificMessage(
                result,
                "ja",
                I18N_CONFIG.TEST_PATTERNS.ja.HELP_MESSAGE
            );
        });

        test("英語ロケールでメッセージが英語表示", async () => {
            const result = await runCLI(["--help"], {
                env: { FLUORITE_LOCALE: "en" },
            });

            assertCLIResult.success(result);
            assertI18n.localeSpecificMessage(
                result,
                "en",
                I18N_CONFIG.TEST_PATTERNS.en.HELP_MESSAGE
            );
        });

        test("無効なロケールでデフォルト（日本語）表示", async () => {
            const result = await runCLI(["--help"], {
                env: { FLUORITE_LOCALE: "invalid-locale" },
            });

            assertCLIResult.success(result);
            assertI18n.localeSpecificMessage(
                result,
                "ja",
                I18N_CONFIG.TEST_PATTERNS.ja.HELP_MESSAGE
            );
        });

        test("LANG環境変数による言語自動検出", async () => {
            const result = await runCLI(["--help"], {
                env: {
                    FLUORITE_LOCALE: undefined,
                    LANG: "en_US.UTF-8",
                },
            });

            assertCLIResult.success(result);
            // 英語または日本語（フォールバック）が表示される
            const hasEnglish = I18N_CONFIG.TEST_PATTERNS.en.HELP_MESSAGE.some(
                (pattern) => result.stdout.includes(pattern)
            );
            const hasJapanese = I18N_CONFIG.TEST_PATTERNS.ja.HELP_MESSAGE.some(
                (pattern) => result.stdout.includes(pattern)
            );

            expect(hasEnglish || hasJapanese).toBe(true);
        });
    });

    describe("デバッグモード", () => {
        test("開発モードでデバッグ情報が表示される", async () => {
            const result = await runCLI(["--help"], {
                env: { NODE_ENV: "development" },
            });

            assertCLIResult.success(result);
            // デバッグ情報の表示を確認（開発モード時のみ）
            expect(result.stdout + result.stderr).toMatch(
                /DEBUG|デバッグ|Working directory/
            );
        });

        test("本番モードでデバッグ情報が非表示", async () => {
            const result = await runCLI(["--help"], {
                env: { NODE_ENV: "production" },
            });

            assertCLIResult.success(result);
            // デバッグ情報が表示されないことを確認
            expect(result.stdout + result.stderr).not.toMatch(
                /DEBUG|Working directory/
            );
        });
    });

    describe("パフォーマンステスト", () => {
        test("ヘルプ表示が高速", async () => {
            const result = await runCLI(["--help"]);

            assertCLIResult.success(result);
            assertCLIResult.performanceThreshold(
                result,
                PERFORMANCE_THRESHOLDS.CLI.HELP
            );
        });

        test("バージョン表示が高速", async () => {
            const result = await runCLI(["--version"]);

            assertCLIResult.success(result);
            assertCLIResult.performanceThreshold(
                result,
                PERFORMANCE_THRESHOLDS.CLI.VERSION
            );
        });

        test("エラーメッセージ表示が高速", async () => {
            const result = await runCLI(["invalid-command"]);

            assertCLIResult.failure(result);
            assertCLIResult.performanceThreshold(
                result,
                PERFORMANCE_THRESHOLDS.CLI.ERROR_MESSAGE
            );
        });

        test("複数コマンドの並行実行", async () => {
            const commands = [
                ["--help"],
                ["--version"],
                ["create", "--help"],
                ["dashboard", "--help"],
            ];

            const promises = commands.map((cmd) => runCLI(cmd));
            const results = await Promise.all(promises);

            // 全てのコマンドが成功することを確認
            for (const result of results) {
                assertCLIResult.success(result);
                assertCLIResult.performanceThreshold(
                    result,
                    PERFORMANCE_THRESHOLDS.CLI.HELP
                );
            }
        });
    });

    describe("環境依存テスト", () => {
        test("Node.js バージョン互換性", async () => {
            const result = await runCLI(["--version"]);

            assertCLIResult.success(result);

            // Node.js バージョン情報がデバッグ出力に含まれるかチェック（開発モード）
            if (process.env.NODE_ENV === "development") {
                expect(result.stdout + result.stderr).toMatch(/Node\.js|node/i);
            }
        });

        test("作業ディレクトリに関係なく動作", async () => {
            const result = await runCLI(["--version"], {
                cwd: "/tmp",
            });

            assertCLIResult.success(result);
            expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
        });

        test("環境変数の影響テスト", async () => {
            const result = await runCLI(["--help"], {
                env: {
                    ...process.env,
                    // 特定の環境変数をクリア
                    FLUORITE_LOCALE: undefined,
                    LANG: undefined,
                    LC_ALL: undefined,
                },
            });

            assertCLIResult.success(result);
            // デフォルトの日本語表示を確認
            assertI18n.localeSpecificMessage(
                result,
                "ja",
                I18N_CONFIG.TEST_PATTERNS.ja.HELP_MESSAGE
            );
        });
    });
});

// EOF
