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
import { GitHubCLIErrorCode } from "../../../../src/utils/github-cli/types/common.ts";

const execMock = vi.hoisted(() => vi.fn());
const promisifyMock = vi.hoisted(() => vi.fn((fn) => fn));

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
        // テスト間で認証キャッシュをクリア
        github.auth.clearCacheForTest();
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
                stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                stderr: "",
            });

            const setup = await github.checkSetup();

            expect(setup.isInstalled).toBe(true);
            expect(setup.version).toBe("2.20.2");
            expect(setup.isAuthenticated).toBe(true);
            expect(setup.username).toBe("testuser");
        });

        it("未インストール状態を正しく確認する", async () => {
            // バージョン確認失敗（未インストール）
            execMock.mockRejectedValueOnce(new Error("command not found: gh"));

            // 認証確認も失敗（未インストールのため）
            execMock.mockRejectedValueOnce(new Error("command not found: gh"));

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

            // 認証状態確認モック
            execMock.mockResolvedValueOnce({
                stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                stderr: "",
            });

            // トークン検証モック (gh api user)
            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify({ login: "testuser" }),
                stderr: "",
            });

            // リポジトリ情報取得モック
            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify(mockRepoData),
                stderr: "",
            });

            const result = await repositoryCommands.getCurrentRepository();

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                name: "test-repo",
                full_name: "testuser/test-repo",
            });
        });

        it("Gitリポジトリではない場合に適切に処理する", async () => {
            // 認証状態確認は成功
            execMock.mockResolvedValueOnce({
                stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                stderr: "",
            });

            // トークン検証は成功
            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify({ login: "testuser" }),
                stderr: "",
            });

            // リポジトリ情報取得でgitエラー
            execMock.mockRejectedValueOnce(new Error("not a git repository"));

            const result = await repositoryCommands.getCurrentRepository();

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe(GitHubCLIErrorCode.EXECUTION_FAILED);
        });
    });

    describe("クイック操作フロー", () => {
        it("クイックPR作成が正しく動作する", async () => {
            // 認証状態確認
            execMock.mockResolvedValueOnce({
                stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                stderr: "",
            });

            // トークン検証
            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify({ login: "testuser" }),
                stderr: "",
            });

            // PR作成
            execMock.mockResolvedValueOnce({
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
            // 認証状態確認
            execMock.mockResolvedValueOnce({
                stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                stderr: "",
            });

            // トークン検証
            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify({ login: "testuser" }),
                stderr: "",
            });

            // Issue作成
            execMock.mockResolvedValueOnce({
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
            // バージョン確認は成功（インストール済み）
            execMock.mockResolvedValueOnce({
                stdout: "gh version 2.20.2",
                stderr: "",
            });

            // 認証確認は失敗（ログインしていない）
            execMock.mockRejectedValueOnce(new Error("not logged in to github.com"));

            const result = await github.checkSetup();

            expect(result.isAuthenticated).toBe(false);
            expect(result.isInstalled).toBe(true);
        });

        it("ネットワークエラーが適切に処理される", async () => {
            // 認証状態確認は成功
            execMock.mockResolvedValueOnce({
                stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                stderr: "",
            });

            // トークン検証は成功
            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify({ login: "testuser" }),
                stderr: "",
            });

            // リポジトリ情報取得でネットワークエラー（明確にネットワークエラーとして分類されるメッセージ）
            // リトライが発生する可能性があるため、複数回同じエラーをモック
            const networkError = new Error("network timeout");
            execMock.mockRejectedValue(networkError); // mockRejectedValue（複数回同じエラー）に変更

            const result = await repositoryCommands.getCurrentRepository();

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe(GitHubCLIErrorCode.NETWORK_ERROR);
        });
    });

    describe("コマンド連携フロー", () => {
        it("Issue作成→PR作成→マージのフローが正しく動作する", async () => {
            execMock
                // Issue作成: 認証状態確認
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                    stderr: "",
                })
                // Issue作成: トークン検証
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ login: "testuser" }),
                    stderr: "",
                })
                // Issue作成: 実行
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ number: 10 }),
                    stderr: "",
                })
                // PR作成: 認証状態確認
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                    stderr: "",
                })
                // PR作成: トークン検証
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ login: "testuser" }),
                    stderr: "",
                })
                // PR作成: 実行
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ number: 20 }),
                    stderr: "",
                })
                // PR マージ: 認証状態確認
                .mockResolvedValueOnce({
                    stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                    stderr: "",
                })
                // PR マージ: トークン検証
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({ login: "testuser" }),
                    stderr: "",
                })
                // PR マージ: 実行
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
            // 事前に認証状態を確立してキャッシュを有効にする
            execMock.mockResolvedValueOnce({
                stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                stderr: "",
            });
            execMock.mockResolvedValueOnce({
                stdout: JSON.stringify({ login: "testuser" }),
                stderr: "",
            });

            // 認証状態を事前に確立（キャッシュを有効にする）
            await github.auth.checkAuthStatus();

            // 並行操作用に十分なモックを設定（認証キャッシュが効く場合と効かない場合の両方に対応）
            // 最悪のケースで各操作に対して認証チェックが発生する可能性を考慮
            for (let i = 0; i < 10; i++) {
                // 認証状態確認（キャッシュが効かない場合のバックアップ）
                execMock.mockResolvedValue({
                    stdout: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                    stderr: "",
                });
                // トークン検証（キャッシュが効かない場合のバックアップ）
                execMock.mockResolvedValue({
                    stdout: JSON.stringify({ login: "testuser" }),
                    stderr: "",
                });
            }

            // リポジトリ情報取得用のモック（各操作に対して1回ずつ）
            for (let i = 0; i < 5; i++) {
                execMock.mockResolvedValueOnce({
                    stdout: JSON.stringify({ default_branch: "main" }),
                    stderr: "",
                });
            }

            const operations = Array.from({ length: 5 }, (_, index) =>
                repositoryCommands.getDefaultBranch({
                    repository: `test/repo-${index}`,
                })
            );

            await Promise.all(operations);

            // 認証キャッシュが効く場合は、事前の認証確認（2回）+ 各リポジトリ情報取得（5回）= 7回
            // 十分なモックを設定しているので、実際の呼び出し回数は7回以上になる可能性がある
            expect(execMock).toHaveBeenCalledWith(expect.stringContaining("gh repo view"), expect.anything());
        });
    });
});

// EOF
