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
} from "../index.js";

// Child processモジュールのモック
vi.mock("node:child_process", () => ({
    exec: vi.fn(),
}));

// Promisify関数のモック
vi.mock("node:util", () => ({
    promisify: vi.fn((fn) => fn),
}));

describe("GitHub CLI ラッパー統合テスト", () => {
    let mockExec: any;

    beforeEach(() => {
        // execのモック設定
        const { exec } = require("node:child_process");
        mockExec = vi.mocked(exec);
    });

    afterEach(() => {
        // 各テスト後にモックをクリア
        vi.clearAllMocks();
    });

    describe("GitHubCLI クラス", () => {
        it("統合クライアントが正しく初期化される", () => {
            // GitHubCLIインスタンスを作成
            const cli = new GitHubCLI();

            // 各プロパティが正しく設定されているか確認
            expect(cli.auth).toBeDefined();
            expect(cli.executor).toBeDefined();
            expect(cli.repository).toBeDefined();
            expect(cli.pullRequest).toBeDefined();
            expect(cli.issue).toBeDefined();
        });

        it("デフォルトエクスポートが正しく動作する", () => {
            // デフォルトエクスポートされたインスタンスを確認
            expect(github).toBeInstanceOf(GitHubCLI);
            expect(github.auth).toBeDefined();
            expect(github.repository).toBeDefined();
        });
    });

    describe("セットアップ確認フロー", () => {
        it("完全なセットアップ状態を正しく確認する", async () => {
            // GitHub CLI のバージョン確認をモック
            mockExec.mockResolvedValueOnce({
                stdout: "gh version 2.20.2 (2023-01-01)",
                stderr: "",
            });

            // 認証ステータス確認をモック
            mockExec.mockResolvedValueOnce({
                stdout: `✓ Logged in to github.com as testuser
✓ Token: oauth
✓ Token scopes: repo, read:org`,
                stderr: "",
            });

            // セットアップ確認を実行
            const setup = await github.checkSetup();

            // 結果を検証
            expect(setup.isInstalled).toBe(true);
            expect(setup.version).toBe("2.20.2");
            expect(setup.isAuthenticated).toBe(true);
            expect(setup.username).toBe("testuser");
        });

        it("未インストール状態を正しく確認する", async () => {
            // GitHub CLI が未インストールの場合をモック
            mockExec.mockRejectedValueOnce(new Error("command not found"));

            // 認証確認も失敗するようにモック
            mockExec.mockRejectedValueOnce(new Error("command not found"));

            // セットアップ確認を実行
            const setup = await github.checkSetup();

            // 結果を検証
            expect(setup.isInstalled).toBe(false);
            expect(setup.version).toBeNull();
            expect(setup.isAuthenticated).toBe(false);
            expect(setup.username).toBeNull();
        });
    });

    describe("リポジトリ情報取得フロー", () => {
        it("現在のリポジトリ情報を正しく取得する", async () => {
            // リポジトリ情報取得をモック
            const mockRepoData = {
                name: "test-repo",
                full_name: "testuser/test-repo",
                description: "Test repository",
                private: false,
                html_url: "https://github.com/testuser/test-repo",
            };

            mockExec.mockResolvedValueOnce({
                stdout: JSON.stringify(mockRepoData),
                stderr: "",
            });

            // PR一覧取得をモック
            const mockPRData = [{ number: 1, title: "Test PR", state: "open" }];

            mockExec.mockResolvedValueOnce({
                stdout: JSON.stringify(mockPRData),
                stderr: "",
            });

            // Issue一覧取得をモック
            const mockIssueData = [
                { number: 2, title: "Test Issue", state: "open" },
            ];

            mockExec.mockResolvedValueOnce({
                stdout: JSON.stringify(mockIssueData),
                stderr: "",
            });

            // 現在のリポジトリ情報を取得
            const repoInfo = await github.getCurrentRepoInfo();

            // 結果を検証
            expect(repoInfo.repository).toEqual(mockRepoData);
            expect(repoInfo.openPullRequests).toHaveLength(1);
            expect(repoInfo.openIssues).toHaveLength(1);
        });

        it("Gitリポジトリではない場合に適切に処理する", async () => {
            // リポジトリ情報取得でエラーをモック
            mockExec.mockRejectedValue(new Error("not a git repository"));

            // 現在のリポジトリ情報を取得
            const repoInfo = await github.getCurrentRepoInfo();

            // エラー時のレスポンスを検証
            expect(repoInfo.repository).toBeNull();
            expect(repoInfo.openPullRequests).toEqual([]);
            expect(repoInfo.openIssues).toEqual([]);
        });
    });

    describe("クイック操作フロー", () => {
        it("クイックPR作成が正しく動作する", async () => {
            // 認証確認をモック（成功）
            mockExec
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser",
                    stderr: "",
                })
                .mockResolvedValueOnce({
                    stdout: '{"login": "testuser"}',
                    stderr: "",
                });

            // PR作成をモック
            const mockPRResponse = {
                number: 123,
                title: "Quick PR",
                html_url: "https://github.com/owner/repo/pull/123",
            };

            mockExec.mockResolvedValueOnce({
                stdout: JSON.stringify(mockPRResponse),
                stderr: "",
            });

            // 現在のユーザー取得をモック（自己アサイン用）
            mockExec.mockResolvedValueOnce({
                stdout: "✓ Logged in to github.com as testuser",
                stderr: "",
            });

            // クイックPR作成を実行
            const result = await github.createQuickPR(
                "Quick PR",
                "Quick PR body",
                { assignToSelf: true }
            );

            // 結果を検証
            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(123);
            expect(result.data?.title).toBe("Quick PR");
        });

        it("クイックIssue作成が正しく動作する", async () => {
            // 認証確認をモック（成功）
            mockExec
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser",
                    stderr: "",
                })
                .mockResolvedValueOnce({
                    stdout: '{"login": "testuser"}',
                    stderr: "",
                });

            // Issue作成をモック
            const mockIssueResponse = {
                number: 456,
                title: "Quick Issue",
                html_url: "https://github.com/owner/repo/issues/456",
            };

            mockExec.mockResolvedValueOnce({
                stdout: JSON.stringify(mockIssueResponse),
                stderr: "",
            });

            // 現在のユーザー取得をモック（自己アサイン用）
            mockExec.mockResolvedValueOnce({
                stdout: "✓ Logged in to github.com as testuser",
                stderr: "",
            });

            // クイックIssue作成を実行
            const result = await github.createQuickIssue(
                "Quick Issue",
                "Quick Issue body",
                {
                    labels: ["bug", "urgent"],
                    assignToSelf: true,
                }
            );

            // 結果を検証
            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(456);
            expect(result.data?.title).toBe("Quick Issue");
        });
    });

    describe("エラーハンドリング統合", () => {
        it("認証エラーが適切に処理される", async () => {
            // 認証失敗をモック
            mockExec.mockRejectedValue(
                new Error("not logged in to github.com")
            );

            // 認証が必要な操作を実行
            const result = await repositoryCommands.listRepositories();

            // エラーレスポンスを検証
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe("AUTH_MISSING");
            expect(result.error?.suggestion).toContain("gh auth login");
        });

        it("ネットワークエラーが適切に処理される", async () => {
            // 認証成功をモック
            mockExec
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser",
                    stderr: "",
                })
                .mockResolvedValueOnce({
                    stdout: '{"login": "testuser"}',
                    stderr: "",
                });

            // ネットワークエラーをモック
            mockExec.mockRejectedValueOnce(new Error("network timeout"));

            // リポジトリ一覧取得を実行
            const result = await repositoryCommands.listRepositories();

            // エラーレスポンスを検証
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe("NETWORK_ERROR");
            expect(result.error?.suggestion).toContain(
                "ネットワーク接続を確認"
            );
        });
    });

    describe("コマンド連携フロー", () => {
        it("Issue作成→PR作成→マージのフローが正しく動作する", async () => {
            // 認証確認を各操作でモック（成功）
            const authMocks = new Array(6).fill(null).map(() => [
                mockExec.mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser",
                    stderr: "",
                }),
                mockExec.mockResolvedValueOnce({
                    stdout: '{"login": "testuser"}',
                    stderr: "",
                }),
            ]);

            // Issue作成をモック
            const mockIssueResponse = {
                number: 789,
                title: "Bug fix",
                state: "open",
            };

            mockExec.mockResolvedValueOnce({
                stdout: JSON.stringify(mockIssueResponse),
                stderr: "",
            });

            // PR作成をモック
            const mockPRResponse = {
                number: 101,
                title: "Fix bug #789",
                state: "open",
            };

            mockExec.mockResolvedValueOnce({
                stdout: JSON.stringify(mockPRResponse),
                stderr: "",
            });

            // PRマージをモック
            mockExec.mockResolvedValueOnce({
                stdout: "Pull request merged",
                stderr: "",
            });

            // フローを実行
            const issueResult = await issueCommands.createIssue({
                title: "Bug fix",
                body: "Fix critical bug",
            });

            const prResult = await pullRequestCommands.createPullRequest({
                title: "Fix bug #789",
                body: "Fixes #789",
            });

            const mergeResult = await pullRequestCommands.mergePullRequest(101);

            // 結果を検証
            expect(issueResult.success).toBe(true);
            expect(prResult.success).toBe(true);
            expect(mergeResult.success).toBe(true);
        });
    });

    describe("パフォーマンステスト", () => {
        it("複数の並行操作が適切に処理される", async () => {
            // 複数の操作を並行実行するためのモック設定
            const promises: Promise<any>[] = [];

            // GitHub CLIのインストール確認
            mockExec.mockResolvedValue({
                stdout: "gh version 2.20.2",
                stderr: "",
            });
            promises.push(github.isAvailable());

            // バージョン取得
            promises.push(github.getVersion());

            // 認証状態確認
            mockExec.mockResolvedValue({
                stdout: "✓ Logged in to github.com as testuser",
                stderr: "",
            });
            promises.push(github.checkAuth());

            // 並行実行
            const startTime = Date.now();
            const results = await Promise.all(promises);
            const executionTime = Date.now() - startTime;

            // 結果を検証
            expect(results[0]).toBe(true); // isAvailable
            expect(results[1]).toBe("2.20.2"); // getVersion
            expect(results[2].isAuthenticated).toBe(true); // checkAuth

            // パフォーマンス検証（実際のコマンド実行よりも高速であることを確認）
            expect(executionTime).toBeLessThan(100); // 100ms以内
        });
    });
});

// EOF
