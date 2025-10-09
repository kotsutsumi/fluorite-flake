/**
 * ダッシュボード基本機能E2Eテスト
 */
import type { ChildProcess } from "node:child_process";
import { afterEach, beforeEach, describe, test } from "vitest";

import { killProcess, sendKey, spawnCLI, waitForOutput } from "../../helpers/cli-runner.js";
import { DASHBOARD_CONFIG, PERFORMANCE_THRESHOLDS, shouldSkipTest } from "../../setup/test-config.js";

describe("ダッシュボード基本機能 E2E テスト", () => {
    let dashboardProcess: ChildProcess | null = null;

    afterEach(async () => {
        if (dashboardProcess) {
            await killProcess(dashboardProcess);
            dashboardProcess = null;
        }
    });

    describe("ダッシュボード起動", () => {
        test("ダッシュボードが正常に起動する", async () => {
            dashboardProcess = spawnCLI(["dashboard"]);

            // ダッシュボードの起動を待機
            await waitForOutput(dashboardProcess, "Vercel", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);

            // 正常に起動していることを確認
            expect(dashboardProcess.exitCode).toBeNull(); // まだ実行中
        });

        test("特定のサービスを指定してダッシュボードを起動", async () => {
            dashboardProcess = spawnCLI(["dashboard", "--service", "github"]);

            // GitHub サービスが選択された状態で起動することを確認
            await waitForOutput(dashboardProcess, "GitHub", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);
        });

        test("無効なサービス指定でエラーが発生", async () => {
            dashboardProcess = spawnCLI(["dashboard", "--service", "invalid-service"]);

            // エラーメッセージが表示されることを確認
            await waitForOutput(dashboardProcess, "無効なサービス", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);
        });
    });

    describe("キーボード操作", () => {
        beforeEach(async () => {
            dashboardProcess = spawnCLI(["dashboard"]);
            await waitForOutput(dashboardProcess, "Vercel", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);
        });

        test("サービス切り替えキーが正常に動作する", async () => {
            // Turso に切り替え
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.SERVICES.turso);
            await waitForOutput(dashboardProcess!, "Turso", PERFORMANCE_THRESHOLDS.DASHBOARD.SERVICE_SWITCH);

            // Supabase に切り替え
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.SERVICES.supabase);
            await waitForOutput(dashboardProcess!, "Supabase", PERFORMANCE_THRESHOLDS.DASHBOARD.SERVICE_SWITCH);

            // GitHub に切り替え
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.SERVICES.github);
            await waitForOutput(dashboardProcess!, "GitHub", PERFORMANCE_THRESHOLDS.DASHBOARD.SERVICE_SWITCH);

            // Vercel に戻る
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.SERVICES.vercel);
            await waitForOutput(dashboardProcess!, "Vercel", PERFORMANCE_THRESHOLDS.DASHBOARD.SERVICE_SWITCH);
        });

        test("タブ切り替えキーが正常に動作する", async () => {
            // Operations タブに切り替え
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.TABS.operations);
            await waitForOutput(dashboardProcess!, "Operations", PERFORMANCE_THRESHOLDS.DASHBOARD.TAB_SWITCH);

            // Logs タブに切り替え
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.TABS.logs);
            await waitForOutput(dashboardProcess!, "Logs", PERFORMANCE_THRESHOLDS.DASHBOARD.TAB_SWITCH);

            // Metrics タブに切り替え
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.TABS.metrics);
            await waitForOutput(dashboardProcess!, "Metrics", PERFORMANCE_THRESHOLDS.DASHBOARD.TAB_SWITCH);

            // Overview タブに戻る
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.TABS.overview);
            await waitForOutput(dashboardProcess!, "Overview", PERFORMANCE_THRESHOLDS.DASHBOARD.TAB_SWITCH);
        });

        test("終了キーでダッシュボードが正常に終了する", async () => {
            // 'q' キーで終了
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.ACTIONS.quit);

            // プロセス終了を待機
            await new Promise<void>((resolve) => {
                dashboardProcess?.on("exit", (code) => {
                    expect(code).toBe(0); // 正常終了
                    resolve();
                });
            });
        });

        test("ESCキーでダッシュボードが正常に終了する", async () => {
            // ESC キーで終了
            sendKey(dashboardProcess!, DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.ACTIONS.escape);

            // プロセス終了を待機
            await new Promise<void>((resolve) => {
                dashboardProcess?.on("exit", (code) => {
                    expect(code).toBe(0); // 正常終了
                    resolve();
                });
            });
        });
    });

    describe("UI表示", () => {
        beforeEach(async () => {
            dashboardProcess = spawnCLI(["dashboard"]);
            await waitForOutput(dashboardProcess, "Vercel", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);
        });

        test("サイドバーに全サービスが表示される", async () => {
            for (const service of DASHBOARD_CONFIG.SERVICES) {
                // 各サービスに切り替えて表示を確認
                const shortcut = DASHBOARD_CONFIG.KEYBOARD_SHORTCUTS.SERVICES[service];
                sendKey(dashboardProcess!, shortcut);

                await waitForOutput(dashboardProcess!, service, PERFORMANCE_THRESHOLDS.DASHBOARD.SERVICE_SWITCH);
            }
        });

        test("キーボードショートカットヘルプが表示される", async () => {
            // ヘルプエリアの表示を確認
            await waitForOutput(dashboardProcess!, "[v] Vercel", 1000);
            await waitForOutput(dashboardProcess!, "[t] Turso", 1000);
            await waitForOutput(dashboardProcess!, "[s] Supabase", 1000);
            await waitForOutput(dashboardProcess!, "[g] GitHub", 1000);
            await waitForOutput(dashboardProcess!, "[q] Quit", 1000);
        });

        test("ステータスバナーが表示される", async () => {
            // ステータスバナーの表示を確認
            await waitForOutput(dashboardProcess!, "認証状態", 1000);
        });
    });

    describe("エラーハンドリング", () => {
        test("認証エラー時の適切な表示", async () => {
            // 認証が必要な状況での表示テスト
            dashboardProcess = spawnCLI(["dashboard"], {
                env: {
                    // 認証情報をクリアして未認証状態をシミュレート
                    VERCEL_TOKEN: "",
                    TURSO_TOKEN: "",
                    SUPABASE_ACCESS_TOKEN: "",
                    GITHUB_TOKEN: "",
                },
            });

            await waitForOutput(dashboardProcess, "未認証", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);
        });

        test("CLI未インストール時の適切な表示", async () => {
            if (shouldSkipTest("local-only")) {
                return;
            }

            // CLI が利用できない状況をシミュレート
            dashboardProcess = spawnCLI(["dashboard"], {
                env: {
                    PATH: "/usr/bin:/bin", // 限定されたPATH
                },
            });

            await waitForOutput(dashboardProcess, "利用できません", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);
        });
    });

    describe("パフォーマンステスト", () => {
        test("ダッシュボード起動時間が基準内", async () => {
            const startTime = Date.now();

            dashboardProcess = spawnCLI(["dashboard"]);
            await waitForOutput(dashboardProcess, "Vercel", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);
        });

        test("サービス切り替え速度が基準内", async () => {
            dashboardProcess = spawnCLI(["dashboard"]);
            await waitForOutput(dashboardProcess, "Vercel", PERFORMANCE_THRESHOLDS.DASHBOARD.STARTUP);

            // 複数回の切り替えで平均時間を測定
            const switchTimes: number[] = [];

            for (let i = 0; i < 3; i++) {
                const startTime = Date.now();
                sendKey(dashboardProcess!, "t"); // Turso
                await waitForOutput(dashboardProcess!, "Turso", 2000);
                switchTimes.push(Date.now() - startTime);

                const startTime2 = Date.now();
                sendKey(dashboardProcess!, "v"); // Vercel
                await waitForOutput(dashboardProcess!, "Vercel", 2000);
                switchTimes.push(Date.now() - startTime2);
            }

            const averageTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
            expect(averageTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.DASHBOARD.SERVICE_SWITCH);
        });
    });
});

// EOF
