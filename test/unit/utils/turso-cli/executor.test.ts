/**
 * Turso CLI executor ユーティリティのテスト
 */
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { executeTursoCommand, parseJsonResponse, throwOnError } from "../../../../src/utils/turso-cli/executor.js";
import type { CommandResult } from "../../../../src/utils/turso-cli/types.js";

// child_processモジュールをモック化
vi.mock("node:child_process", () => ({
    spawn: vi.fn(),
}));

describe("executeTursoCommand", () => {
    // 各テストケース前にモックをリセット
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("コマンドが成功した場合、正しい結果を返す", async () => {
        // モックのChildProcessインスタンスを作成
        const mockChild = new EventEmitter() as ChildProcess;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();

        // spawnのモックを設定
        const { spawn } = await import("node:child_process");
        vi.mocked(spawn).mockReturnValue(mockChild as ChildProcess);

        // テスト実行を開始
        const resultPromise = executeTursoCommand(["auth", "whoami"]);

        // 標準出力に成功データを送信
        mockChild.stdout?.emit("data", "Logged in as: testuser\n");

        // プロセス終了をシミュレート（成功）
        mockChild.emit("close", 0);

        // 結果を検証
        const result = await resultPromise;
        expect(result.success).toBe(true);
        expect(result.stdout).toBe("Logged in as: testuser");
        expect(result.stderr).toBe("");
    });

    it("コマンドが失敗した場合、エラー情報を返す", async () => {
        // モックのChildProcessインスタンスを作成
        const mockChild = new EventEmitter() as ChildProcess;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();

        // spawnのモックを設定
        const { spawn } = await import("node:child_process");
        vi.mocked(spawn).mockReturnValue(mockChild as ChildProcess);

        // テスト実行を開始
        const resultPromise = executeTursoCommand(["invalid", "command"]);

        // エラー出力にエラーメッセージを送信
        mockChild.stderr?.emit("data", "Command not found\n");

        // プロセス終了をシミュレート（失敗）
        mockChild.emit("close", 1);

        // 結果を検証
        const result = await resultPromise;
        expect(result.success).toBe(false);
        expect(result.error).toBe("Command failed with exit code 1");
        expect(result.stderr).toBe("Command not found");
    });

    it("コマンドがタイムアウトした場合、適切なエラーを返す", async () => {
        // モックのChildProcessインスタンスを作成
        const mockChild = new EventEmitter() as ChildProcess;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = vi.fn();

        // spawnのモックを設定
        const { spawn } = await import("node:child_process");
        vi.mocked(spawn).mockReturnValue(mockChild as ChildProcess);

        // タイムアウトを1msに設定してテスト実行
        const resultPromise = executeTursoCommand(["slow", "command"], {
            timeout: 1,
        });

        // 少し待ってからタイムアウト処理を確認
        const result = await resultPromise;
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Command timeout after/);
        expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("プロセス実行エラーが発生した場合、適切なエラーを返す", async () => {
        // モックのChildProcessインスタンスを作成
        const mockChild = new EventEmitter() as ChildProcess;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();

        // spawnのモックを設定
        const { spawn } = await import("node:child_process");
        vi.mocked(spawn).mockReturnValue(mockChild as ChildProcess);

        // テスト実行を開始
        const resultPromise = executeTursoCommand(["test"]);

        // プロセスエラーをシミュレート
        mockChild.emit("error", new Error("ENOENT: turso command not found"));

        // 結果を検証
        const result = await resultPromise;
        expect(result.success).toBe(false);
        expect(result.error).toBe("Failed to execute command: ENOENT: turso command not found");
    });
});

describe("parseJsonResponse", () => {
    it("有効なJSONレスポンスを正しくパースする", () => {
        // 成功したコマンド結果にJSONデータを設定
        const mockResult: CommandResult = {
            success: true,
            stdout: '{"name": "test-db", "url": "libsql://test.turso.io"}',
        };

        // JSONパースを実行
        const parsed = parseJsonResponse<{ name: string; url: string }>(mockResult);

        // 結果を検証
        expect(parsed.success).toBe(true);
        expect(parsed.data).toEqual({
            name: "test-db",
            url: "libsql://test.turso.io",
        });
    });

    it("無効なJSONの場合、エラーを返す", () => {
        // 無効なJSONを含むコマンド結果を設定
        const mockResult: CommandResult = {
            success: true,
            stdout: "invalid json",
        };

        // JSONパースを実行
        const parsed = parseJsonResponse(mockResult);

        // エラー結果を検証
        expect(parsed.success).toBe(false);
        expect(parsed.error).toMatch(/Failed to parse JSON response/);
    });

    it("既に失敗しているコマンド結果はそのまま返す", () => {
        // 失敗したコマンド結果を設定
        const mockResult: CommandResult = {
            success: false,
            error: "Command failed",
        };

        // JSONパースを実行
        const parsed = parseJsonResponse(mockResult);

        // 元の失敗結果がそのまま返されることを検証
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe("Command failed");
    });
});

describe("throwOnError", () => {
    it("成功したコマンド結果の場合、エラーを投げない", () => {
        // 成功したコマンド結果を設定
        const mockResult: CommandResult = {
            success: true,
            stdout: "Success",
        };

        // エラーが投げられないことを検証
        expect(() => {
            throwOnError(mockResult, "test command");
        }).not.toThrow();
    });

    it("失敗したコマンド結果の場合、TursoCliErrorを投げる", () => {
        // 失敗したコマンド結果を設定
        const mockResult: CommandResult = {
            success: false,
            error: "Database not found",
            stderr: "Error: database 'test' does not exist",
        };

        // TursoCliErrorが投げられることを検証
        expect(() => {
            throwOnError(mockResult, "turso db show test");
        }).toThrow("Database not found");
    });

    it("エラーメッセージが無い場合、デフォルトメッセージでエラーを投げる", () => {
        // エラーメッセージが無い失敗したコマンド結果を設定
        const mockResult: CommandResult = {
            success: false,
        };

        // デフォルトメッセージでエラーが投げられることを検証
        expect(() => {
            throwOnError(mockResult, "turso test");
        }).toThrow("Command failed");
    });
});

// EOF
