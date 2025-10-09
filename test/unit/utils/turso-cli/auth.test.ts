/**
 * Turso CLI 認証関連ユーティリティのテスト
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    createApiToken,
    getToken,
    isAuthenticated,
    listApiTokens,
    login,
    loginHeadless,
    logout,
    revokeApiToken,
    signup,
    whoami,
} from "../../../../src/utils/turso-cli/auth.js";

// executorモジュールをモック化
vi.mock("../../../../src/utils/turso-cli/executor.js", () => ({
    executeTursoCommand: vi.fn(),
    throwOnError: vi.fn(),
}));

describe("Turso CLI Auth", () => {
    beforeEach(() => {
        // 各テストケース前にモックをリセット
        vi.clearAllMocks();
    });

    describe("whoami", () => {
        it("ユーザー情報を正しく取得する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Logged in as: testuser",
            });

            // whoami関数を実行
            const result = await whoami();

            // 結果を検証
            expect(result.username).toBe("testuser");
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "whoami"]);
        });

        it("シンプルなユーザー名形式でも正しく取得する", async () => {
            // executeTursoCommandのモックを設定（シンプルなユーザー名のみ）
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "kotsutsumi",
            });

            // whoami関数を実行
            const result = await whoami();

            // 結果を検証
            expect(result.username).toBe("kotsutsumi");
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "whoami"]);
        });

        it("パース不可能な出力の場合エラーを投げる", async () => {
            // executeTursoCommandのモックを設定（パース不可能な出力）
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "not logged in",
            });

            // エラーが投げられることを検証
            await expect(whoami()).rejects.toThrow("Unable to parse whoami output");
        });
    });

    describe("getToken", () => {
        it("認証トークンを正しく取得する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "abc123def456",
            });

            // getToken関数を実行
            const result = await getToken();

            // 結果を検証
            expect(result.token).toBe("abc123def456");
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "token"]);
        });

        it("空の出力の場合、空のトークンを返す", async () => {
            // executeTursoCommandのモックを設定（空の出力）
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "",
            });

            // getToken関数を実行
            const result = await getToken();

            // 空のトークンが返されることを検証
            expect(result.token).toBe("");
        });
    });

    describe("loginHeadless", () => {
        it("ヘッドレスログインコマンドを正しく実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Login successful",
            });

            // loginHeadless関数を実行
            const result = await loginHeadless();

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "login", "--headless"]);
        });
    });

    describe("login", () => {
        it("通常のログインコマンドを正しく実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Login successful",
            });

            // login関数を実行
            const result = await login();

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "login"]);
        });
    });

    describe("logout", () => {
        it("通常のログアウトコマンドを正しく実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Logout successful",
            });

            // logout関数を実行
            const result = await logout();

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "logout"]);
        });

        it("全セッションログアウトフラグが指定された場合、--allオプションを追加する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "All sessions logged out",
            });

            // 全セッションログアウトを実行
            const result = await logout(true);

            // --allオプションが追加されることを検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "logout", "--all"]);
        });
    });

    describe("signup", () => {
        it("通常のサインアップコマンドを正しく実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Signup successful",
            });

            // signup関数を実行
            const result = await signup();

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "signup"]);
        });

        it("ヘッドレスフラグが指定された場合、--headlessオプションを追加する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Headless signup successful",
            });

            // ヘッドレスサインアップを実行
            const result = await signup(true);

            // --headlessオプションが追加されることを検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "signup", "--headless"]);
        });
    });

    describe("API Token管理", () => {
        it("listApiTokens - APIトークン一覧を取得する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "token1\ntoken2\ntoken3",
            });

            // listApiTokens関数を実行
            const result = await listApiTokens();

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "api-tokens", "list"]);
        });

        it("createApiToken - APIトークンを作成する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Token created: my-token",
            });

            // createApiToken関数を実行
            const result = await createApiToken("my-token");

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "api-tokens", "mint", "my-token"]);
        });

        it("revokeApiToken - APIトークンを無効化する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Token revoked: my-token",
            });

            // revokeApiToken関数を実行
            const result = await revokeApiToken("my-token");

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["auth", "api-tokens", "revoke", "my-token"]);
        });
    });

    describe("isAuthenticated", () => {
        it("whoamiが成功した場合、trueを返す", async () => {
            // executeTursoCommandのモックを設定（成功）
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Logged in as: testuser",
            });

            // isAuthenticated関数を実行
            const result = await isAuthenticated();

            // 認証されていることを検証
            expect(result).toBe(true);
        });

        it("whoamiが失敗した場合、falseを返す", async () => {
            // throwOnErrorがエラーを投げるようにモック設定
            const { throwOnError } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(throwOnError).mockImplementation(() => {
                throw new Error("Not authenticated");
            });

            // isAuthenticated関数を実行
            const result = await isAuthenticated();

            // 認証されていないことを検証
            expect(result).toBe(false);
        });
    });
});

// EOF
