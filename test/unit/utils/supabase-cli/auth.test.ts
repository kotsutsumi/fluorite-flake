/**
 * Supabase CLI 認証ユーティリティのテスト
 *
 * 認証関連機能（ログイン、ログアウト、認証状態確認）をテストします。
 * 実際のSupabase CLIは呼び出さず、モック化して安全にテストします。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    getLoginInfo,
    isAuthenticated,
    login,
    logout,
    whoami,
} from "../../../../src/utils/supabase-cli/auth.js";

// executor モジュールをモック化
vi.mock("../../../../src/utils/supabase-cli/executor.js", () => ({
    executeSupabaseCommand: vi.fn(),
    throwOnError: vi.fn(),
}));

describe("Supabase CLI Auth", () => {
    beforeEach(() => {
        // テスト毎にモックをリセット
        vi.clearAllMocks();
    });

    describe("login", () => {
        it("基本的なログインを実行する", async () => {
            // executeSupabaseCommand のモックインポート
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            // モック関数の設定 - 正常終了を模擬
            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "Login successful",
                stderr: "",
                exitCode: 0,
            });

            // 基本的なログイン実行
            await login();

            // 正しいコマンドが実行されたかを確認
            expect(executeSupabaseCommand).toHaveBeenCalledWith(["login"]);
            expect(throwOnError).toHaveBeenCalled();
        });

        it("トークンを使用したログインを実行する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "Login successful with token",
                stderr: "",
                exitCode: 0,
            });

            // トークンを使用したログイン
            await login({
                token: "test-token-123",
                noBrowser: true,
                name: "test-session",
            });

            // トークンオプション付きのコマンドが実行されたかを確認
            expect(executeSupabaseCommand).toHaveBeenCalledWith([
                "login",
                "--name",
                "test-session",
                "--no-browser",
                "--token",
                "test-token-123",
            ]);
            expect(throwOnError).toHaveBeenCalled();
        });

        it("グローバルフラグを含むログインを実行する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "Login successful with flags",
                stderr: "",
                exitCode: 0,
            });

            // グローバルフラグ付きのログイン
            await login(
                { name: "production" },
                {
                    debug: true,
                    profile: "prod",
                    workdir: "/project/path",
                    yes: true,
                }
            );

            // グローバルフラグ付きのコマンドが実行されたかを確認
            expect(executeSupabaseCommand).toHaveBeenCalledWith([
                "login",
                "--name",
                "production",
                "--debug",
                "--profile",
                "prod",
                "--workdir",
                "/project/path",
                "--yes",
            ]);
        });
    });

    describe("logout", () => {
        it("基本的なログアウトを実行する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "Logout successful",
                stderr: "",
                exitCode: 0,
            });

            // 基本的なログアウト実行
            await logout();

            // 正しいコマンドが実行されたかを確認
            expect(executeSupabaseCommand).toHaveBeenCalledWith(["logout"]);
            expect(throwOnError).toHaveBeenCalled();
        });

        it("グローバルフラグを含むログアウトを実行する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "Logout successful with flags",
                stderr: "",
                exitCode: 0,
            });

            // グローバルフラグ付きのログアウト
            await logout({
                debug: true,
                profile: "test",
                yes: true,
            });

            // グローバルフラグ付きのコマンドが実行されたかを確認
            expect(executeSupabaseCommand).toHaveBeenCalledWith([
                "logout",
                "--debug",
                "--profile",
                "test",
                "--yes",
            ]);
        });
    });

    describe("getLoginInfo", () => {
        it("ログイン済み状態を正しく検出する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            // プロジェクト一覧の取得が成功した場合（ログイン済み）
            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: '[{"id": "project1", "name": "Test Project"}]',
                stderr: "",
                exitCode: 0,
            });

            const loginInfo = await getLoginInfo();

            // ログイン済み状態の確認
            expect(loginInfo.isLoggedIn).toBe(true);
            expect(loginInfo.username).toBe("authenticated-user");
            expect(executeSupabaseCommand).toHaveBeenCalledWith([
                "projects",
                "list",
                "--output",
                "json",
            ]);
        });

        it("未ログイン状態を正しく検出する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            // throwOnError がエラーをスローする場合（未ログイン）
            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "",
                stderr: "Authentication required",
                exitCode: 1,
            });

            vi.mocked(throwOnError).mockImplementation(() => {
                throw new Error("Authentication required");
            });

            const loginInfo = await getLoginInfo();

            // 未ログイン状態の確認
            expect(loginInfo.isLoggedIn).toBe(false);
            expect(loginInfo.username).toBe("");
        });

        it("グローバルフラグを含む認証状態確認を実行する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "[]",
                stderr: "",
                exitCode: 0,
            });

            // グローバルフラグ付きの認証状態確認
            await getLoginInfo({
                debug: true,
                profile: "staging",
                workdir: "/app",
            });

            // グローバルフラグ付きのコマンドが実行されたかを確認
            expect(executeSupabaseCommand).toHaveBeenCalledWith([
                "projects",
                "list",
                "--debug",
                "--profile",
                "staging",
                "--workdir",
                "/app",
                "--output",
                "json",
            ]);
        });
    });

    describe("whoami", () => {
        it("ログイン済みユーザーの情報を取得する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            // ログイン済み状態を模擬
            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: '[{"id": "user-project"}]',
                stderr: "",
                exitCode: 0,
            });

            // throwOnError は正常終了なので何もしない
            vi.mocked(throwOnError).mockImplementation(() => {
                // 正常な場合は何も処理しない
            });

            const username = await whoami();

            // ユーザー名の取得確認
            expect(username).toBe("authenticated-user");
        });

        it("未ログイン時にエラーをスローする", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            // 未ログイン状態を模擬
            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "",
                stderr: "Not authenticated",
                exitCode: 1,
            });

            vi.mocked(throwOnError).mockImplementation(() => {
                throw new Error("Not authenticated");
            });

            // 未ログイン時のエラー確認
            await expect(whoami()).rejects.toThrow("Not logged in");
        });
    });

    describe("isAuthenticated", () => {
        it("ログイン済み状態でtrueを返す", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            // ログイン済み状態を模擬
            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: '[{"id": "test-project"}]',
                stderr: "",
                exitCode: 0,
            });

            // throwOnError は正常終了なので何もしない
            vi.mocked(throwOnError).mockImplementation(() => {
                // 正常な場合は何も処理しない
            });

            const isAuth = await isAuthenticated();

            // 認証状態の確認
            expect(isAuth).toBe(true);
        });

        it("未ログイン状態でfalseを返す", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            // 未ログイン状態を模擬
            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "",
                stderr: "Authentication required",
                exitCode: 1,
            });

            vi.mocked(throwOnError).mockImplementation(() => {
                throw new Error("Authentication required");
            });

            const isAuth = await isAuthenticated();

            // 未認証状態の確認
            expect(isAuth).toBe(false);
        });

        it("例外発生時にfalseを返す", async () => {
            const { executeSupabaseCommand } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            // executeSupabaseCommand で例外発生を模擬
            vi.mocked(executeSupabaseCommand).mockRejectedValue(
                new Error("Network error")
            );

            const isAuth = await isAuthenticated();

            // 例外時の未認証扱い確認
            expect(isAuth).toBe(false);
        });

        it("グローバルフラグを含む認証確認を実行する", async () => {
            const { executeSupabaseCommand, throwOnError } = await import(
                "../../../../src/utils/supabase-cli/executor.js"
            );

            vi.mocked(executeSupabaseCommand).mockResolvedValue({
                stdout: "[]",
                stderr: "",
                exitCode: 0,
            });

            // グローバルフラグ付きの認証確認
            await isAuthenticated({
                profile: "development",
                debug: true,
            });

            // グローバルフラグ付きのコマンドが実行されたかを確認
            expect(executeSupabaseCommand).toHaveBeenCalledWith([
                "projects",
                "list",
                "--debug",
                "--profile",
                "development",
                "--output",
                "json",
            ]);
        });
    });
});

// EOF
