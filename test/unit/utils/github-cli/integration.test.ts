/**
 * GitHub CLI ラッパー統合テスト
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    GitHubCLI,
    github,
    issueCommands,
    pullRequestCommands,
    repositoryCommands,
} from "../../../../src/utils/github-cli/index.ts";

const execMock = vi.fn();
const promisifyMock = vi.fn((fn) => fn);

vi.mock("node:child_process", () => ({
    exec: execMock,
}));

vi.mock("node:util", () => ({
    promisify: promisifyMock,
}));

describe("GitHub CLI ラッパー統合テスト", () => {
    beforeEach(() => {
        execMock.mockReset();
        promisifyMock.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("GitHubCLI クラス", () => {
        it("統合クライアントが正しく初期化される", () => {
            const cli = new GitHubCLI();
            expect(cli.auth).toBeDefined();
            expect(cli.executor).toBeDefined();
            expect(cli.repository).toBeDefined();
            expect(cli.pullRequest).toBeDefined();
            expect(cli.issue).toBeDefined();
        });

        it("デフォルトエクスポートが正しく動作する", () => {
            expect(github).toBeInstanceOf(GitHubCLI);
            expect(github.auth).toBeDefined();
            expect(github.repository).toBeDefined();
        });
    });

    describe("セットアップ確認フロー", () => {
        it("完全なセットアップ状態を正しく確認する", async () => {
            execMock.mockResolvedValueOnce({
                stdout: "gh version 2.20.2 (2023-01-01)",
                stderr: "",
            });

            execMock.mockResolvedValueOnce({
                stdout: `✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org`,
                stderr: "",
            });

            const setup = await github.checkSetup();

            expect(setup.isInstalled).toBe(true);
            expect(setup.version).toBe("2.20.2");
            expect(setup.isAuthenticated).toBe(true);
            expect(setup.username).toBe("testuser");
        });

        it("未インストール状態を正しく確認する", async () => {
            execMock.mockRejectedValueOnce(new Error("command not found"));
            execMock.mockRejectedValueOnce(new Error("command not found"));

            const setup = await github.checkSetup();

            expect(setup.isInstalled).toBe(false);
            expect(setup.version).toBeNull();
            expect(setup.isAuthenticated).toBe(false);
            expect(setup.username).toBeNull();
        });
    });

    describe("リポジトリ情報取得フロー", () => {
        it("現在のリポジトリ情報を正しく取得する", async () => {
            const mockRepoData = {
                name: "test-repo",
                full_name: "testuser/test-repo",
                description: "Test repository",
                private: false,
                html_url: "https://github.com/testuser/test-repo",
            };

            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify(mockRepoData),
                stderr: "",
            });

            const mockPRData = [{ number: 1, title: "Test PR", state: "open" }];
            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify(mockPRData),
                stderr: "",
            });

            const result = await repositoryCommands.getCurrentRepository();

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                name: "test-repo",
                owner: "testuser",
            });
        });

        it("Gitリポジトリではない場合に適切に処理する", async () => {
            execMock.mockRejectedValue(new Error("not a git repository"));

            const result = await repositoryCommands.getCurrentRepository();

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe(GitHubCLIErrorCode.EXECUTION_FAILED);
        });
    });

    describe("クイック操作フロー", () => {
        it("クイックPR作成が正しく動作する", async () => {
            execMock
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser",
                    stderr: "",
                })
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ number: 42, title: "Feature" }),
                    stderr: "",
                });

            const result = await pullRequestCommands.quickCreate({
                title: "Feature",
                body: "Details",
            });

            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(42);
        });

        it("クイックIssue作成が正しく動作する", async () => {
            execMock
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser",
                    stderr: "",
                })
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ number: 99, title: "Bug" }),
                    stderr: "",
                });

            const result = await issueCommands.quickCreate({
                title: "Bug",
                body: "Steps",
            });

            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(99);
        });
    });

    describe("エラーハンドリング統合", () => {
        it("認証エラーが適切に処理される", async () => {
            execMock.mockRejectedValue(new Error("not logged in to github.com"));

            const result = await github.checkSetup();

            expect(result.isAuthenticated).toBe(false);
        });

        it("ネットワークエラーが適切に処理される", async () => {
            execMock
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser",
                    stderr: "",
                })
                .mockRejectedValueOnce(new Error("network timeout"));

            const result = await repositoryCommands.getCurrentRepository();

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe(GitHubCLIErrorCode.NETWORK_ERROR);
        });
    });

    describe("コマンド連携フロー", () => {
        it("Issue作成→PR作成→マージのフローが正しく動作する", async () => {
            execMock
                .mockResolvedValueOnce({ stdout: "✓ Logged in", stderr: "" })
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ number: 10 }),
                    stderr: "",
                })
                .mockResolvedValueOnce({ stdout: "✓ Logged in", stderr: "" })
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ number: 20 }),
                    stderr: "",
                })
                .mockResolvedValueOnce({ stdout: "✓ Logged in", stderr: "" })
                .mockResolvedValueOnce({ stdout: "Merged", stderr: "" });

            const issue = await issueCommands.quickCreate({
                title: "Bug",
                body: "Fix it",
            });
            expect(issue.success).toBe(true);

            const pr = await pullRequestCommands.quickCreate({
                title: "Fix",
                body: "Fix bug",
            });
            expect(pr.success).toBe(true);

            const merge = await pullRequestCommands.merge({ number: 20 });
            expect(merge.success).toBe(true);
        });
    });

    describe("パフォーマンステスト", () => {
        it("複数の並行操作が適切に処理される", async () => {
            execMock.mockResolvedValue({
                stdout: "gh version 2.20.2",
                stderr: "",
            });

            const operations = Array.from({ length: 5 }, (_, index) =>
                repositoryCommands.getDefaultBranch({
                    owner: "test",
                    repo: `repo-${index}`,
                })
            );

            await Promise.all(operations);
            expect(execMock).toHaveBeenCalledTimes(5);
        });
    });
});

// EOF
