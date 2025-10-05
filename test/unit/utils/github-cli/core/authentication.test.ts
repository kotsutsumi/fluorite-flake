/**
 * GitHub CLI 認証管理システムのテスト
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationManager } from "../../../../../src/utils/github-cli/core/authentication.ts";
import { GitHubCLIError } from "../../../../../src/utils/github-cli/core/error-handler.ts";
import { GitHubCLIErrorCode } from "../../../../../src/utils/github-cli/types/common.ts";

const executeRawMock = vi.hoisted(() => vi.fn());

// GitHub CLI エグゼキュータのモック
vi.mock("../../../../../src/utils/github-cli/core/command-executor.ts", () => ({
    githubCLI: {
        executeRaw: executeRawMock,
    },
}));

describe("AuthenticationManager", () => {
    let authManager: AuthenticationManager;

    beforeEach(() => {
        authManager = new AuthenticationManager();
        executeRawMock.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("checkAuthStatus", () => {
        it("認証済みユーザーの情報を正しく解析する", async () => {
            const mockAuthOutput =
                "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org, user";

            executeRawMock.mockResolvedValue({
                success: true,
                data: mockAuthOutput,
            });

            const authStatus = await authManager.checkAuthStatus();

            expect(authStatus.isAuthenticated).toBe(true);
            expect(authStatus.username).toBe("testuser");
            expect(authStatus.tokenType).toBe("oauth");
            expect(authStatus.scopes).toEqual(["repo", "read:org", "user"]);
        });

        it("未認証ユーザーに対して適切なステータスを返す", async () => {
            executeRawMock.mockResolvedValue({
                success: false,
                data: "not logged in",
            });

            const authStatus = await authManager.checkAuthStatus();

            expect(authStatus.isAuthenticated).toBe(false);
            expect(authStatus.username).toBeUndefined();
            expect(authStatus.tokenType).toBeUndefined();
            expect(authStatus.scopes).toBeUndefined();
        });

        it("キャッシュ機能が正しく動作する", async () => {
            const mockAuthOutput =
                "✓ Logged in to github.com as testuser\n✓ Token: oauth";

            executeRawMock.mockResolvedValueOnce({
                success: true,
                data: mockAuthOutput,
            });

            const status1 = await authManager.checkAuthStatus();
            expect(status1.isAuthenticated).toBe(true);

            const status2 = await authManager.checkAuthStatus();
            expect(status2.isAuthenticated).toBe(true);
            expect(executeRawMock).toHaveBeenCalledTimes(1);
        });

        it("認証ステータス取得エラー時に適切なエラーを投げる", async () => {
            executeRawMock.mockRejectedValue(new Error("Command failed"));

            try {
                await authManager.checkAuthStatus();
                expect.fail("エラーが投げられるべきです");
            } catch (error) {
                expect(error).toBeInstanceOf(GitHubCLIError);
                expect((error as GitHubCLIError).code).toBe(
                    GitHubCLIErrorCode.AUTH_FAILED
                );
            }
        });
    });

    describe("validateToken", () => {
        it("有効なトークンに対してtrueを返す", async () => {
            executeRawMock.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as testuser\n✓ Token: oauth",
            });

            const result = await authManager.validateToken();
            expect(result).toBe(true);
        });

        it("無効なトークンに対してfalseを返す", async () => {
            executeRawMock.mockResolvedValue({ success: false, data: "" });

            const result = await authManager.validateToken();
            expect(result).toBe(false);
        });
    });

    describe("isLoggedIn", () => {
        it("認証済みの場合にtrueを返す", async () => {
            executeRawMock.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
            });
            const result = await authManager.isLoggedIn();
            expect(result).toBe(true);
        });

        it("未認証の場合にfalseを返す", async () => {
            executeRawMock.mockResolvedValue({
                success: false,
                data: "not logged in",
            });
            const result = await authManager.isLoggedIn();
            expect(result).toBe(false);
        });
    });

    describe("getCurrentUser", () => {
        it("現在のユーザー名を正しく返す", async () => {
            executeRawMock.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as testuser",
            });

            const username = await authManager.getCurrentUser();
            expect(username).toBe("testuser");
        });

        it("未認証の場合にnullを返す", async () => {
            executeRawMock.mockResolvedValue({ success: false, data: "" });
            const username = await authManager.getCurrentUser();
            expect(username).toBeNull();
        });
    });

    describe("getScopes", () => {
        it("トークンスコープを正しく返す", async () => {
            executeRawMock.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as testuser\n✓ Token scopes: repo, read:org",
            });

            const scopes = await authManager.getScopes();
            expect(scopes).toEqual(["repo", "read:org"]);
        });

        it("スコープ情報がない場合に空配列を返す", async () => {
            executeRawMock.mockResolvedValue({
                success: true,
                data: "✓ Logged in",
            });
            const scopes = await authManager.getScopes();
            expect(scopes).toEqual([]);
        });
    });

    describe("getTokenType", () => {
        it("OAuthトークンタイプを正しく返す", async () => {
            executeRawMock.mockResolvedValue({
                success: true,
                data: "✓ Token: oauth",
            });

            const type = await authManager.getTokenType();
            expect(type).toBe("oauth");
        });

        it("Personal Access Tokenタイプを正しく返す", async () => {
            executeRawMock.mockResolvedValue({
                success: true,
                data: "✓ Logged in to github.com as testuser\n✓ Token: personal access token\n✓ Token scopes: repo, read:org",
            });

            const type = await authManager.getTokenType();
            expect(type).toBe("personal_access_token");
        });

        it("トークン情報がない場合にnullを返す", async () => {
            executeRawMock.mockResolvedValue({ success: true, data: "" });
            const type = await authManager.getTokenType();
            expect(type).toBeNull();
        });
    });

    describe("refreshAuthStatus", () => {
        it("キャッシュをクリアして新しいステータスを取得する", async () => {
            executeRawMock
                .mockResolvedValueOnce({
                    success: true,
                    data: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
                })
                .mockResolvedValueOnce({
                    success: false,
                    data: "not logged in",
                });

            const status1 = await authManager.refreshAuthStatus();
            expect(status1.isAuthenticated).toBe(true);

            const status2 = await authManager.refreshAuthStatus();
            expect(status2.isAuthenticated).toBe(false);
            expect(executeRawMock).toHaveBeenCalledTimes(2);
        });
    });

    describe("requireAuth", () => {
        it("認証済みかつ有効なトークンの場合に正常終了する", async () => {
            // 認証状態確認 - 成功
            executeRawMock.mockResolvedValueOnce({
                success: true,
                data: "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org",
            });
            // トークン検証 - 成功
            executeRawMock.mockResolvedValueOnce({
                success: true,
                data: '{"login":"testuser"}',
            });
            await expect(authManager.requireAuth()).resolves.not.toThrow();
        });

        it("未認証の場合にエラーを投げる", async () => {
            executeRawMock.mockResolvedValue({
                success: false,
                data: "not logged in",
            });

            try {
                await authManager.requireAuth();
                expect.fail("エラーが投げられるべきです");
            } catch (error) {
                expect(error).toBeInstanceOf(GitHubCLIError);
                expect((error as GitHubCLIError).code).toBe(
                    GitHubCLIErrorCode.AUTH_MISSING
                );
            }
        });

        it("認証済みだがトークンが無効な場合にエラーを投げる", async () => {
            executeRawMock.mockResolvedValue({
                success: true,
                data: "✓ Logged in\n✗ Token scopes: none",
            });

            await expect(authManager.requireAuth()).rejects.toThrow(
                GitHubCLIErrorCode.PERMISSION_DENIED
            );
        });
    });

    describe("parseAuthStatus（プライベートメソッドテスト）", () => {
        it("複合的な認証情報を正しく解析する", () => {
            const parseMethod = (authManager as any).parseAuthStatus.bind(
                authManager
            );
            const status = parseMethod(
                "✓ Logged in to github.com as testuser\n✓ Token: oauth\n✓ Token scopes: repo, read:org"
            );

            expect(status.isAuthenticated).toBe(true);
            expect(status.username).toBe("testuser");
            expect(status.tokenType).toBe("oauth");
            expect(status.scopes).toEqual(["repo", "read:org"]);
        });

        it("部分的な認証情報も正しく解析する", () => {
            const parseMethod = (authManager as any).parseAuthStatus.bind(
                authManager
            );
            const status = parseMethod("× not logged in to github.com");

            expect(status.isAuthenticated).toBe(false);
            expect(status.username).toBeUndefined();
        });
    });
});

// EOF
