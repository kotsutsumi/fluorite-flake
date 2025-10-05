/**
 * GitHub CLI 認証管理システムのテスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationManager } from "../../core/authentication.js";
import { GitHubCLIErrorCode } from "../../types/common.js";

// GitHub CLI エグゼキュータのモック
vi.mock("../../core/command-executor.js", () => ({
    githubCLI: {
        executeRaw: vi.fn(),
    },
}));

describe("AuthenticationManager", () => {
    let authManager: AuthenticationManager;
    let mockExecuteRaw: any;

    beforeEach(() => {
        // 認証マネージャーのインスタンスを作成
        authManager = new AuthenticationManager();

        // モック関数を設定
        const { githubCLI } = require("../../core/command-executor.js");
        mockExecuteRaw = vi.mocked(githubCLI.executeRaw);
    });

    afterEach(() => {
        // 各テスト後にモックをクリア
        vi.clearAllMocks();
    });

    describe("checkAuthStatus", () => {
        it("認証済みユーザーの情報を正しく解析する", async () => {
            // 認証済みユーザーのgh auth statusの出力をモック
            const mockAuthOutput = `✓ Logged in to github.com as testuser
✓ Git operations for github.com configured to use https protocol.
✓ Token: oauth
✓ Token scopes: repo, read:org, user`;

            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: mockAuthOutput,
            });

            // 認証ステータスを取得
            const authStatus = await authManager.checkAuthStatus();

            // 結果を検証
            expect(authStatus.isAuthenticated).toBe(true);
            expect(authStatus.username).toBe("testuser");
            expect(authStatus.tokenType).toBe("oauth");
            expect(authStatus.scopes).toEqual(["repo", "read:org", "user"]);
        });

        it("未認証ユーザーに対して適切なステータスを返す", async () => {
            // 未認証ユーザーのエラーレスポンスをモック
            mockExecuteRaw.mockResolvedValue({
                success: false,
                data: "not logged in",
            });

            // 認証ステータスを取得
            const authStatus = await authManager.checkAuthStatus();

            // 結果を検証
            expect(authStatus.isAuthenticated).toBe(false);
            expect(authStatus.username).toBeUndefined();
            expect(authStatus.tokenType).toBeUndefined();
            expect(authStatus.scopes).toBeUndefined();
        });

        it("キャッシュ機能が正しく動作する", async () => {
            // 最初の呼び出し用のモック設定
            const mockAuthOutput = `✓ Logged in to github.com as testuser
✓ Token: oauth`;

            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: mockAuthOutput,
            });

            // 最初の呼び出し
            const firstResult = await authManager.checkAuthStatus();

            // 2回目の呼び出し（キャッシュされるはず）
            const secondResult = await authManager.checkAuthStatus();

            // 結果を検証
            expect(firstResult).toEqual(secondResult);
            expect(mockExecuteRaw).toHaveBeenCalledTimes(1); // 1回だけ呼び出される
        });

        it("認証ステータス取得エラー時に適切なエラーを投げる", async () => {
            // エラーをモック
            mockExecuteRaw.mockRejectedValue(new Error("Command failed"));

            // エラーが投げられることを確認
            await expect(authManager.checkAuthStatus()).rejects.toThrow();

            // エラーのプロパティを確認
            try {
                await authManager.checkAuthStatus();
            } catch (error: any) {
                expect(error.code).toBe(GitHubCLIErrorCode.AUTH_FAILED);
                expect(error.suggestion).toContain("gh auth login");
            }
        });
    });

    describe("validateToken", () => {
        it("有効なトークンに対してtrueを返す", async () => {
            // 有効なAPIレスポンスをモック
            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: JSON.stringify({ login: "testuser", id: 12_345 }),
            });

            // トークン検証を実行
            const isValid = await authManager.validateToken();

            // 結果を検証
            expect(isValid).toBe(true);
        });

        it("無効なトークンに対してfalseを返す", async () => {
            // 無効なAPIレスポンスをモック
            mockExecuteRaw.mockResolvedValue({
                success: false,
                data: "Unauthorized",
            });

            // トークン検証を実行
            const isValid = await authManager.validateToken();

            // 結果を検証
            expect(isValid).toBe(false);
        });
    });

    describe("isLoggedIn", () => {
        it("認証済みの場合にtrueを返す", async () => {
            // 認証済みステータスをモック
            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as testuser",
            });

            // ログイン状態を確認
            const isLoggedIn = await authManager.isLoggedIn();

            // 結果を検証
            expect(isLoggedIn).toBe(true);
        });

        it("未認証の場合にfalseを返す", async () => {
            // 未認証ステータスをモック
            mockExecuteRaw.mockResolvedValue({
                success: false,
                data: "not logged in",
            });

            // ログイン状態を確認
            const isLoggedIn = await authManager.isLoggedIn();

            // 結果を検証
            expect(isLoggedIn).toBe(false);
        });
    });

    describe("getCurrentUser", () => {
        it("現在のユーザー名を正しく返す", async () => {
            // ユーザー情報を含むステータスをモック
            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as currentuser",
            });

            // 現在のユーザーを取得
            const username = await authManager.getCurrentUser();

            // 結果を検証
            expect(username).toBe("currentuser");
        });

        it("未認証の場合にnullを返す", async () => {
            // 未認証ステータスをモック
            mockExecuteRaw.mockResolvedValue({
                success: false,
                data: "not logged in",
            });

            // 現在のユーザーを取得
            const username = await authManager.getCurrentUser();

            // 結果を検証
            expect(username).toBeNull();
        });
    });

    describe("getScopes", () => {
        it("トークンスコープを正しく返す", async () => {
            // スコープ情報を含むステータスをモック
            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: `✓ Logged in to github.com as testuser
✓ Token scopes: repo, read:org, user, gist`,
            });

            // スコープを取得
            const scopes = await authManager.getScopes();

            // 結果を検証
            expect(scopes).toEqual(["repo", "read:org", "user", "gist"]);
        });

        it("スコープ情報がない場合に空配列を返す", async () => {
            // スコープ情報なしのステータスをモック
            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as testuser",
            });

            // スコープを取得
            const scopes = await authManager.getScopes();

            // 結果を検証
            expect(scopes).toEqual([]);
        });
    });

    describe("getTokenType", () => {
        it("OAuthトークンタイプを正しく返す", async () => {
            // OAuthトークン情報をモック
            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: "✓ Token: oauth",
            });

            // トークンタイプを取得
            const tokenType = await authManager.getTokenType();

            // 結果を検証
            expect(tokenType).toBe("oauth");
        });

        it("Personal Access Tokenタイプを正しく返す", async () => {
            // PATトークン情報をモック
            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: "✓ Token: personal access token",
            });

            // トークンタイプを取得
            const tokenType = await authManager.getTokenType();

            // 結果を検証
            expect(tokenType).toBe("personal_access_token");
        });

        it("トークン情報がない場合にnullを返す", async () => {
            // トークン情報なしのステータスをモック
            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as testuser",
            });

            // トークンタイプを取得
            const tokenType = await authManager.getTokenType();

            // 結果を検証
            expect(tokenType).toBeNull();
        });
    });

    describe("refreshAuthStatus", () => {
        it("キャッシュをクリアして新しいステータスを取得する", async () => {
            // 最初のステータス
            mockExecuteRaw.mockResolvedValueOnce({
                success: true,
                data: "✓ Logged in to github.com as user1",
            });

            // 最初の呼び出し
            const firstStatus = await authManager.checkAuthStatus();
            expect(firstStatus.username).toBe("user1");

            // 新しいステータス
            mockExecuteRaw.mockResolvedValueOnce({
                success: true,
                data: "✓ Logged in to github.com as user2",
            });

            // リフレッシュ実行
            const refreshedStatus = await authManager.refreshAuthStatus();

            // 結果を検証
            expect(refreshedStatus.username).toBe("user2");
            expect(mockExecuteRaw).toHaveBeenCalledTimes(2);
        });
    });

    describe("requireAuth", () => {
        it("認証済みかつ有効なトークンの場合に正常終了する", async () => {
            // 認証済み状態をモック
            mockExecuteRaw
                .mockResolvedValueOnce({
                    success: true,
                    data: "✓ Logged in to github.com as testuser",
                })
                .mockResolvedValueOnce({
                    success: true,
                    data: '{"login": "testuser"}',
                });

            // requireAuthを実行（エラーが投げられないことを確認）
            await expect(authManager.requireAuth()).resolves.not.toThrow();
        });

        it("未認証の場合にエラーを投げる", async () => {
            // 未認証状態をモック
            mockExecuteRaw.mockResolvedValue({
                success: false,
                data: "not logged in",
            });

            // エラーが投げられることを確認
            await expect(authManager.requireAuth()).rejects.toThrow();

            // エラーの詳細を確認
            try {
                await authManager.requireAuth();
            } catch (error: any) {
                expect(error.code).toBe(GitHubCLIErrorCode.AUTH_MISSING);
            }
        });

        it("認証済みだがトークンが無効な場合にエラーを投げる", async () => {
            // 認証済みだがトークン無効をモック
            mockExecuteRaw
                .mockResolvedValueOnce({
                    success: true,
                    data: "✓ Logged in to github.com as testuser",
                })
                .mockResolvedValueOnce({
                    success: false,
                    data: "Unauthorized",
                });

            // エラーが投げられることを確認
            await expect(authManager.requireAuth()).rejects.toThrow();

            // エラーの詳細を確認
            try {
                await authManager.requireAuth();
            } catch (error: any) {
                expect(error.code).toBe(GitHubCLIErrorCode.AUTH_EXPIRED);
            }
        });
    });

    describe("parseAuthStatus（プライベートメソッドテスト）", () => {
        it("複合的な認証情報を正しく解析する", async () => {
            // 複合的な認証情報をモック
            const complexAuthOutput = `✓ Logged in to github.com as complexuser
✓ Git operations for github.com configured to use https protocol.
✓ Token: personal access token
✓ Token scopes: repo, read:org, user, admin:org, gist, workflow`;

            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: complexAuthOutput,
            });

            // 認証ステータスを取得
            const authStatus = await authManager.checkAuthStatus();

            // 詳細な解析結果を検証
            expect(authStatus.isAuthenticated).toBe(true);
            expect(authStatus.username).toBe("complexuser");
            expect(authStatus.tokenType).toBe("personal_access_token");
            expect(authStatus.scopes).toEqual([
                "repo",
                "read:org",
                "user",
                "admin:org",
                "gist",
                "workflow",
            ]);
        });

        it("部分的な認証情報も正しく解析する", async () => {
            // 部分的な認証情報をモック（一部の情報が欠けている）
            const partialAuthOutput = `✓ Logged in to github.com as partialuser
✓ Git operations for github.com configured to use https protocol.`;

            mockExecuteRaw.mockResolvedValue({
                success: true,
                data: partialAuthOutput,
            });

            // 認証ステータスを取得
            const authStatus = await authManager.checkAuthStatus();

            // 部分的な解析結果を検証
            expect(authStatus.isAuthenticated).toBe(true);
            expect(authStatus.username).toBe("partialuser");
            expect(authStatus.tokenType).toBeUndefined();
            expect(authStatus.scopes).toBeUndefined();
        });
    });
});

// EOF
