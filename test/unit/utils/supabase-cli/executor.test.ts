/**
 * Supabase CLI executor ユーティリティのテスト
 *
 * child_process.spawn を使用したコマンド実行機能をテストします。
 * 実際のSupabase CLIは呼び出さず、モックを使用して安全にテストします。
 */
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    executeSupabaseCommand,
    parseJsonResponse,
    throwOnError,
} from "../../../../src/utils/supabase-cli/executor.js";
import type { CommandResult } from "../../../../src/utils/supabase-cli/types.js";

// child_process モジュールをモック化
vi.mock("node:child_process", () => ({
    spawn: vi.fn(),
}));

describe("Supabase CLI Executor", () => {
    // テスト毎に実行される初期化処理
    beforeEach(() => {
        // 各テスト開始前にタイマーをクリア
        vi.clearAllTimers();
        // モック関数の呼び出し履歴をリセット
        vi.clearAllMocks();
        // fake timers を使用してタイムアウト処理をテスト
        vi.useFakeTimers();
    });

    // テスト後のクリーンアップ処理
    afterEach(() => {
        // real timers に戻す
        vi.useRealTimers();
    });

    describe("executeSupabaseCommand", () => {
        it("成功時に正しい結果を返す", async () => {
            // モックプロセスの作成 - EventEmitter を継承してイベントを発火可能にする
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockProcess.kill = vi.fn(); // プロセス終了用のメソッドをモック

            // child_process.spawn をモック化
            const { spawn } = await import("node:child_process");
            vi.mocked(spawn).mockReturnValue(mockProcess);

            // コマンド実行を非同期で開始
            const resultPromise = executeSupabaseCommand(["projects", "list"]);

            // 標準出力にデータを送信（JSON形式のプロジェクト一覧を模擬）
            mockProcess.stdout.emit("data", Buffer.from('{"projects": ['));
            mockProcess.stdout.emit(
                "data",
                Buffer.from('{"id": "test-project"}]}')
            );

            // プロセス終了イベントを発火（終了コード0で正常終了）
            mockProcess.emit("close", 0);

            // 結果を待機して検証
            const result = await resultPromise;

            // 期待される結果の検証
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe(
                '{"projects": [{"id": "test-project"}]}'
            );
            expect(result.stderr).toBe("");
            expect(result.error).toBeUndefined();

            // spawn が正しい引数で呼び出されたかを確認
            expect(spawn).toHaveBeenCalledWith(
                "supabase",
                ["projects", "list"],
                {
                    cwd: process.cwd(),
                    env: process.env,
                    stdio: ["ignore", "pipe", "pipe"],
                }
            );
        });

        it("エラー時に適切なエラー情報を返す", async () => {
            // エラーを発生させるモックプロセス
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockProcess.kill = vi.fn();

            const { spawn } = await import("node:child_process");
            vi.mocked(spawn).mockReturnValue(mockProcess);

            const resultPromise = executeSupabaseCommand([
                "invalid",
                "command",
            ]);

            // 標準エラー出力にエラーメッセージを送信
            mockProcess.stderr.emit("data", Buffer.from("Command not found"));

            // プロセス終了時に非ゼロの終了コードを返す（エラー状態）
            mockProcess.emit("close", 1);

            const result = await resultPromise;

            // エラー結果の検証
            expect(result.exitCode).toBe(1);
            expect(result.stdout).toBe("");
            expect(result.stderr).toBe("Command not found");
            expect(result.error).toBeUndefined();
        });

        it("タイムアウト時に適切に処理する", async () => {
            // タイムアウトテスト用のモックプロセス
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockProcess.kill = vi.fn();

            const { spawn } = await import("node:child_process");
            vi.mocked(spawn).mockReturnValue(mockProcess);

            // タイムアウト設定を1秒に設定
            const resultPromise = executeSupabaseCommand(["slow", "command"], {
                timeout: 1000,
            });

            // 1秒経過させてタイムアウトを発生
            vi.advanceTimersByTime(1000);

            const result = await resultPromise;

            // タイムアウト結果の検証
            expect(result.exitCode).toBe(-1);
            expect(result.error).toBeDefined();
            expect(result.error?.message).toContain("Command timed out");
            expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
        });

        it("プロセスエラー時に適切に処理する", async () => {
            // プロセス起動エラーを模擬するモックプロセス
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockProcess.kill = vi.fn();

            const { spawn } = await import("node:child_process");
            vi.mocked(spawn).mockReturnValue(mockProcess);

            const resultPromise = executeSupabaseCommand(["test"]);

            // プロセス起動エラーを発火
            const processError = new Error("spawn supabase ENOENT");
            mockProcess.emit("error", processError);

            const result = await resultPromise;

            // プロセスエラー結果の検証
            expect(result.exitCode).toBe(-1);
            expect(result.error).toBe(processError);
        });

        it("カスタム環境変数と作業ディレクトリを使用する", async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockProcess.kill = vi.fn();

            const { spawn } = await import("node:child_process");
            vi.mocked(spawn).mockReturnValue(mockProcess);

            const resultPromise = executeSupabaseCommand(["test"], {
                env: { CUSTOM_VAR: "test" },
                cwd: "/custom/path",
            });

            mockProcess.emit("close", 0);

            await resultPromise;

            // カスタム設定で spawn が呼び出されたかを確認
            expect(spawn).toHaveBeenCalledWith("supabase", ["test"], {
                cwd: "/custom/path",
                env: { ...process.env, CUSTOM_VAR: "test" },
                stdio: ["ignore", "pipe", "pipe"],
            });
        });
    });

    describe("parseJsonResponse", () => {
        it("有効なJSONレスポンスを正しくパースする", () => {
            // 正常なJSONレスポンスのテスト
            const result: CommandResult = {
                stdout: '{"test": "value", "number": 42}',
                stderr: "",
                exitCode: 0,
            };

            const parsed = parseJsonResponse(result);

            expect(parsed).toEqual({ test: "value", number: 42 });
        });

        it("空の出力時にエラーをスローする", () => {
            // 出力が空の場合のエラーハンドリングをテスト
            const result: CommandResult = {
                stdout: "",
                stderr: "",
                exitCode: 0,
            };

            expect(() => parseJsonResponse(result)).toThrow(
                "No output to parse"
            );
        });

        it("無効なJSON時にエラーをスローする", () => {
            // 不正なJSON形式の場合のエラーハンドリングをテスト
            const result: CommandResult = {
                stdout: "invalid json content",
                stderr: "",
                exitCode: 0,
            };

            expect(() => parseJsonResponse(result)).toThrow(
                "Failed to parse JSON response"
            );
        });

        it("型付きレスポンスを正しく処理する", () => {
            // TypeScript の型指定機能をテスト
            type TestType = {
                id: string;
                name: string;
            };

            const result: CommandResult = {
                stdout: '{"id": "123", "name": "test"}',
                stderr: "",
                exitCode: 0,
            };

            const parsed = parseJsonResponse<TestType>(result);

            expect(parsed.id).toBe("123");
            expect(parsed.name).toBe("test");
        });
    });

    describe("throwOnError", () => {
        it("成功時に例外をスローしない", () => {
            // 正常終了時は例外をスローしないことを確認
            const result: CommandResult = {
                stdout: "success",
                stderr: "",
                exitCode: 0,
            };

            expect(() => throwOnError(result, "test command")).not.toThrow();
        });

        it("エラー終了時に例外をスローする", () => {
            // 非ゼロ終了コード時の例外処理をテスト
            const result: CommandResult = {
                stdout: "",
                stderr: "Command failed",
                exitCode: 1,
            };

            expect(() => throwOnError(result, "test command")).toThrow(
                "Supabase command failed: test command"
            );
        });

        it("プロセスエラー時に例外をスローする", () => {
            // プロセスエラー時の例外処理をテスト
            const result: CommandResult = {
                stdout: "",
                stderr: "",
                exitCode: 0,
                error: new Error("Process error"),
            };

            expect(() => throwOnError(result, "test command")).toThrow(
                "Supabase command failed: test command"
            );
        });

        it("エラー詳細情報を含む例外をスローする", () => {
            // エラー詳細情報が正しく含まれることをテスト
            const result: CommandResult = {
                stdout: "",
                stderr: "Detailed error message",
                exitCode: 2,
                error: new Error("Original error"),
            };

            try {
                throwOnError(result, "test command");
            } catch (error: any) {
                expect(error.command).toBe("test command");
                expect(error.exitCode).toBe(2);
                expect(error.stderr).toBe("Detailed error message");
                expect(error.message).toContain("test command");
                expect(error.message).toContain("Original error");
                expect(error.message).toContain("Detailed error message");
            }
        });
    });
});

// EOF
