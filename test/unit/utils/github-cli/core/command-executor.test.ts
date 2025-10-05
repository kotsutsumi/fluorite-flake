/**
 * GitHub CLI コマンド実行エンジンのテスト
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GitHubCLIExecutor } from "../../../../../src/utils/github-cli/core/command-executor.ts";
import type { GitHubCLICommand } from "../../../../../src/utils/github-cli/types/common.ts";
import { GitHubCLIErrorCode } from "../../../../../src/utils/github-cli/types/common.ts";

const execMock = vi.fn();
const promisifyMock = vi.fn((fn) => fn);

// Child processモジュールのモック
vi.mock("node:child_process", () => ({
    exec: execMock,
}));

// Promisify関数のモック
vi.mock("node:util", () => ({
    promisify: promisifyMock,
}));

describe("GitHubCLIExecutor", () => {
    let executor: GitHubCLIExecutor;

    beforeEach(() => {
        executor = new GitHubCLIExecutor();
        execMock.mockReset();
        promisifyMock.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("execute", () => {
        it("成功時に正しいレスポンスを返す", async () => {
            const mockOutput = JSON.stringify({ name: "test-repo", id: 123 });
            execMock.mockResolvedValue({ stdout: mockOutput, stderr: "" });

            const command: GitHubCLICommand = {
                command: "repo",
                args: ["view", "owner/repo"],
                flags: { json: true },
            };

            const result = await executor.execute(command);

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ name: "test-repo", id: 123 });
            expect(result.exitCode).toBe(0);
            expect(typeof result.executionTime).toBe("number");
            expect(result.executionTime).toBeGreaterThan(0);
        });

        it("エラー時に適切なエラーレスポンスを返す", async () => {
            const errorMessage = "Command failed";
            execMock.mockRejectedValue(new Error(errorMessage));

            const command: GitHubCLICommand = {
                command: "invalid-command",
            };

            const result = await executor.execute(command);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.exitCode).toBe(1);
            expect(typeof result.executionTime).toBe("number");
        });

        it("無効なコマンドで検証エラーを返す", async () => {
            const command = {} as GitHubCLICommand;
            const result = await executor.execute(command);
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe(
                GitHubCLIErrorCode.VALIDATION_ERROR
            );
        });

        it("危険なコマンドを拒否する", async () => {
            const command: GitHubCLICommand = {
                command: "repo delete",
            };
            const result = await executor.execute(command);
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe(
                GitHubCLIErrorCode.VALIDATION_ERROR
            );
        });
    });

    describe("executeRaw", () => {
        it("生コマンド文字列を正しく実行する", async () => {
            const mockOutput = "gh version 2.20.2";
            execMock.mockResolvedValue({ stdout: mockOutput, stderr: "" });

            const result = await executor.executeRaw("gh --version");

            expect(result.success).toBe(true);
            expect(result.data).toBe(mockOutput.trim());
            expect(result.raw).toBe(mockOutput);
        });
    });

    describe("buildCommandString", () => {
        it("基本的なコマンドを正しく構築する", () => {
            const buildMethod = (executor as any).buildCommandString.bind(
                executor
            );

            const command1: GitHubCLICommand = {
                command: "repo",
            };
            expect(buildMethod(command1)).toBe("gh repo");

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

            expect(result).toContain("gh repo view");
            expect(result).toContain("--json");
            expect(result).toContain("--limit 10");
            expect(result).toContain("--org test-org");
            expect(result).not.toContain("--private");
        });
    });

    describe("checkInstallation", () => {
        it("インストール確認が成功時にtrueを返す", async () => {
            execMock.mockResolvedValue({
                stdout: "gh version 2.20.2",
                stderr: "",
            });
            const result = await executor.checkInstallation();
            expect(result).toBe(true);
        });

        it("インストール確認が失敗時にfalseを返す", async () => {
            execMock.mockRejectedValue(new Error("command not found"));
            const result = await executor.checkInstallation();
            expect(result).toBe(false);
        });
    });

    describe("getVersion", () => {
        it("バージョン情報を正しく抽出する", async () => {
            const mockOutput = "gh version 2.20.2 (2023-01-01)";
            execMock.mockResolvedValue({ stdout: mockOutput, stderr: "" });

            const result = await executor.getVersion();
            expect(result).toBe("2.20.2");
        });

        it("バージョン情報が取得できない場合にnullを返す", async () => {
            execMock.mockResolvedValue({
                stdout: "invalid output",
                stderr: "",
            });
            const result = await executor.getVersion();
            expect(result).toBeNull();
        });

        it("エラー時にnullを返す", async () => {
            execMock.mockRejectedValue(new Error("command failed"));
            const result = await executor.getVersion();
            expect(result).toBeNull();
        });
    });

    describe("parseResponse", () => {
        it("JSON文字列を正しくパースする", () => {
            const parseMethod = (executor as any).parseResponse.bind(executor);
            const jsonOutput = JSON.stringify({ name: "test", value: 123 });
            const command: GitHubCLICommand = { command: "test" };

            const result = parseMethod(jsonOutput, command);
            expect(result).toEqual({ name: "test", value: 123 });
        });

        it("非JSON文字列をそのまま返す", () => {
            const parseMethod = (executor as any).parseResponse.bind(executor);
            const textOutput = "plain text output";
            const command: GitHubCLICommand = { command: "test" };

            const result = parseMethod(textOutput, command);
            expect(result).toBe(textOutput);
        });

        it("空文字列の場合にundefinedを返す", () => {
            const parseMethod = (executor as any).parseResponse.bind(executor);
            const emptyOutput = "";
            const command: GitHubCLICommand = { command: "test" };

            const result = parseMethod(emptyOutput, command);
            expect(result).toBeUndefined();
        });
    });

    describe("リトライ機能", () => {
        it("一時的な失敗後に成功する", async () => {
            let callCount = 0;
            execMock.mockImplementation(() => {
                callCount++;
                if (callCount <= 2) {
                    return Promise.reject(new Error("Network error"));
                }
                return Promise.resolve({ stdout: "success", stderr: "" });
            });

            const command: GitHubCLICommand = { command: "repo" };
            const result = await executor.execute(command, { retryCount: 3 });

            expect(result.success).toBe(true);
            expect(callCount).toBe(3);
        });

        it("すべてのリトライが失敗した場合", async () => {
            execMock.mockRejectedValue(new Error("Persistent error"));

            const command: GitHubCLICommand = { command: "repo" };
            const result = await executor.execute(command, { retryCount: 2 });

            expect(result.success).toBe(false);
            expect(execMock).toHaveBeenCalledTimes(2);
        });
    });
});

// EOF
