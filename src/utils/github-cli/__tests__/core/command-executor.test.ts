/**
 * GitHub CLI コマンド実行エンジンのテスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubCLIExecutor } from "../../core/command-executor.js";
import type { GitHubCLICommand } from "../../types/common.js";
import { GitHubCLIErrorCode } from "../../types/common.js";

// Child processモジュールのモック
vi.mock("node:child_process", () => ({
    exec: vi.fn(),
}));

// Promisify関数のモック
vi.mock("node:util", () => ({
    promisify: vi.fn((fn) => fn),
}));

describe("GitHubCLIExecutor", () => {
    let executor: GitHubCLIExecutor;
    let mockExec: any;

    beforeEach(() => {
        // エグゼキュータインスタンスを作成
        executor = new GitHubCLIExecutor();

        // execのモック設定
        const { exec } = require("node:child_process");
        mockExec = vi.mocked(exec);
    });

    afterEach(() => {
        // 各テスト後にモックをクリア
        vi.clearAllMocks();
    });

    describe("execute", () => {
        it("成功時に正しいレスポンスを返す", async () => {
            // モックの戻り値を設定 - 成功ケース
            const mockOutput = JSON.stringify({ name: "test-repo", id: 123 });
            mockExec.mockResolvedValue({ stdout: mockOutput, stderr: "" });

            // テスト対象のコマンドを定義
            const command: GitHubCLICommand = {
                command: "repo",
                args: ["view", "owner/repo"],
                flags: { json: true },
            };

            // コマンドを実行
            const result = await executor.execute(command);

            // 結果を検証
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ name: "test-repo", id: 123 });
            expect(result.exitCode).toBe(0);
            expect(typeof result.executionTime).toBe("number");
            expect(result.executionTime).toBeGreaterThan(0);
        });

        it("エラー時に適切なエラーレスポンスを返す", async () => {
            // モックの戻り値を設定 - エラーケース
            const errorMessage = "Command failed";
            mockExec.mockRejectedValue(new Error(errorMessage));

            // テスト対象のコマンドを定義
            const command: GitHubCLICommand = {
                command: "invalid-command",
            };

            // コマンドを実行
            const result = await executor.execute(command);

            // エラーレスポンスを検証
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.exitCode).toBe(1);
            expect(typeof result.executionTime).toBe("number");
        });

        it("無効なコマンドで検証エラーを返す", async () => {
            // 無効なコマンドを定義（command プロパティなし）
            const command = {} as GitHubCLICommand;

            // コマンドを実行
            const result = await executor.execute(command);

            // 検証エラーを確認
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe(
                GitHubCLIErrorCode.VALIDATION_ERROR
            );
        });

        it("危険なコマンドを拒否する", async () => {
            // 危険なコマンドを定義
            const command: GitHubCLICommand = {
                command: "repo delete",
            };

            // コマンドを実行
            const result = await executor.execute(command);

            // 検証エラーを確認
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe(
                GitHubCLIErrorCode.VALIDATION_ERROR
            );
        });
    });

    describe("executeRaw", () => {
        it("生コマンド文字列を正しく実行する", async () => {
            // モックの戻り値を設定
            const mockOutput = "gh version 2.20.2";
            mockExec.mockResolvedValue({ stdout: mockOutput, stderr: "" });

            // 生コマンド文字列を実行
            const result = await executor.executeRaw("gh --version");

            // 結果を検証
            expect(result.success).toBe(true);
            expect(result.data).toBe(mockOutput.trim());
            expect(result.raw).toBe(mockOutput);
        });
    });

    describe("buildCommandString", () => {
        it("基本的なコマンドを正しく構築する", () => {
            // リフレクションを使用してプライベートメソッドをテスト
            const buildMethod = (executor as any).buildCommandString.bind(
                executor
            );

            // 基本コマンド
            const command1: GitHubCLICommand = {
                command: "repo",
            };
            expect(buildMethod(command1)).toBe("gh repo");

            // 引数付きコマンド
            const command2: GitHubCLICommand = {
                command: "repo",
                args: ["view", "owner/repo"],
            };
            expect(buildMethod(command2)).toBe("gh repo view owner/repo");
        });

        it("フラグを正しく構築する", () => {
            const buildMethod = (executor as any).buildCommandString.bind(
                executor
            );

            // フラグ付きコマンド
            const command: GitHubCLICommand = {
                command: "repo",
                args: ["view"],
                flags: {
                    json: true,
                    limit: 10,
                    private: false,
                    org: "test-org",
                },
            };

            const result = buildMethod(command);

            // フラグが正しく含まれているかチェック
            expect(result).toContain("gh repo view");
            expect(result).toContain("--json");
            expect(result).toContain("--limit 10");
            expect(result).toContain("--org test-org");
            expect(result).not.toContain("--private"); // false の場合は含まれない
        });
    });

    describe("checkInstallation", () => {
        it("インストール確認が成功時にtrueを返す", async () => {
            // モックの戻り値を設定 - 成功ケース
            mockExec.mockResolvedValue({
                stdout: "gh version 2.20.2",
                stderr: "",
            });

            // インストール確認を実行
            const result = await executor.checkInstallation();

            // 結果を検証
            expect(result).toBe(true);
        });

        it("インストール確認が失敗時にfalseを返す", async () => {
            // モックの戻り値を設定 - エラーケース
            mockExec.mockRejectedValue(new Error("command not found"));

            // インストール確認を実行
            const result = await executor.checkInstallation();

            // 結果を検証
            expect(result).toBe(false);
        });
    });

    describe("getVersion", () => {
        it("バージョン情報を正しく抽出する", async () => {
            // モックの戻り値を設定
            const mockOutput = "gh version 2.20.2 (2023-01-01)";
            mockExec.mockResolvedValue({ stdout: mockOutput, stderr: "" });

            // バージョン取得を実行
            const result = await executor.getVersion();

            // 結果を検証
            expect(result).toBe("2.20.2");
        });

        it("バージョン情報が取得できない場合にnullを返す", async () => {
            // モックの戻り値を設定 - 無効な出力
            const mockOutput = "invalid output";
            mockExec.mockResolvedValue({ stdout: mockOutput, stderr: "" });

            // バージョン取得を実行
            const result = await executor.getVersion();

            // 結果を検証
            expect(result).toBeNull();
        });

        it("エラー時にnullを返す", async () => {
            // モックの戻り値を設定 - エラーケース
            mockExec.mockRejectedValue(new Error("command failed"));

            // バージョン取得を実行
            const result = await executor.getVersion();

            // 結果を検証
            expect(result).toBeNull();
        });
    });

    describe("parseResponse", () => {
        it("JSON文字列を正しくパースする", () => {
            // リフレクションを使用してプライベートメソッドをテスト
            const parseMethod = (executor as any).parseResponse.bind(executor);

            // JSONデータをテスト
            const jsonOutput = JSON.stringify({ name: "test", value: 123 });
            const command: GitHubCLICommand = { command: "test" };

            const result = parseMethod(jsonOutput, command);

            // 結果を検証
            expect(result).toEqual({ name: "test", value: 123 });
        });

        it("非JSON文字列をそのまま返す", () => {
            const parseMethod = (executor as any).parseResponse.bind(executor);

            // 非JSONデータをテスト
            const textOutput = "plain text output";
            const command: GitHubCLICommand = { command: "test" };

            const result = parseMethod(textOutput, command);

            // 結果を検証
            expect(result).toBe(textOutput);
        });

        it("空文字列の場合にundefinedを返す", () => {
            const parseMethod = (executor as any).parseResponse.bind(executor);

            // 空文字列をテスト
            const emptyOutput = "";
            const command: GitHubCLICommand = { command: "test" };

            const result = parseMethod(emptyOutput, command);

            // 結果を検証
            expect(result).toBeUndefined();
        });
    });

    describe("リトライ機能", () => {
        it("一時的な失敗後に成功する", async () => {
            // 最初の2回は失敗、3回目は成功するようにモック設定
            let callCount = 0;
            mockExec.mockImplementation(() => {
                callCount++;
                if (callCount <= 2) {
                    return Promise.reject(new Error("Network error"));
                }
                return Promise.resolve({ stdout: "success", stderr: "" });
            });

            // リトライ設定付きでコマンド実行
            const command: GitHubCLICommand = { command: "repo" };
            const result = await executor.execute(command, { retryCount: 3 });

            // 結果を検証
            expect(result.success).toBe(true);
            expect(callCount).toBe(3); // 3回目で成功
        });

        it("すべてのリトライが失敗した場合", async () => {
            // 常に失敗するようにモック設定
            mockExec.mockRejectedValue(new Error("Persistent error"));

            // リトライ設定付きでコマンド実行
            const command: GitHubCLICommand = { command: "repo" };
            const result = await executor.execute(command, { retryCount: 2 });

            // 結果を検証
            expect(result.success).toBe(false);
            expect(mockExec).toHaveBeenCalledTimes(2); // 2回リトライ
        });
    });
});

// EOF
