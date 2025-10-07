/**
 * Supabase CLI 認証関連ユーティリティ
 *
 * 認証、ログイン、ログアウト機能を提供します。
 */
import { executeSupabaseCommand, throwOnError } from "./executor.js";
import type { GlobalFlags, LoginInfo, LoginOptions } from "./types.js";

/**
 * アクセストークンを使用してログインします
 *
 * @param options - ログインオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function login(
    options: LoginOptions = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["login"];

    // オプションの追加
    if (options.name) {
        args.push("--name", options.name);
    }

    if (options.noBrowser) {
        args.push("--no-browser");
    }

    if (options.token) {
        args.push("--token", options.token);
    }

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * ログアウトしてアクセストークンをローカルから削除します
 *
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function logout(globalFlags: GlobalFlags = {}): Promise<void> {
    const args = ["logout"];

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * 現在のログイン状態を確認します
 *
 * @param globalFlags - グローバルフラグ
 * @returns Promise<LoginInfo> - ログイン情報
 */
export async function getLoginInfo(
    globalFlags: GlobalFlags = {}
): Promise<LoginInfo> {
    const args = ["projects", "list"];

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    // 出力フォーマットをJSONに設定
    args.push("--output", "json");

    try {
        const result = await executeSupabaseCommand(args);
        throwOnError(result, `supabase ${args.join(" ")}`);

        // プロジェクト一覧が取得できた場合はログイン済み
        return {
            username: "authenticated-user", // 実際のユーザー名は別のコマンドから取得可能
            isLoggedIn: true,
        };
    } catch (error) {
        // 認証エラーの場合はログインしていない
        return {
            username: "",
            isLoggedIn: false,
        };
    }
}

/**
 * 現在のログインユーザー情報を確認します（認証が必要）
 *
 * @param globalFlags - グローバルフラグ
 * @returns Promise<string> - ユーザー名またはメールアドレス
 */
export async function whoami(globalFlags: GlobalFlags = {}): Promise<string> {
    // 直接的な whoami コマンドは存在しないため、プロジェクト一覧から推測
    const loginInfo = await getLoginInfo(globalFlags);

    if (!loginInfo.isLoggedIn) {
        throw new Error("Not logged in");
    }

    return loginInfo.username;
}

/**
 * 認証トークンの状態を確認します
 *
 * @param globalFlags - グローバルフラグ
 * @returns Promise<boolean> - 認証されているかどうか
 */
export async function isAuthenticated(
    globalFlags: GlobalFlags = {}
): Promise<boolean> {
    try {
        const loginInfo = await getLoginInfo(globalFlags);
        return loginInfo.isLoggedIn;
    } catch {
        return false;
    }
}

// EOF
