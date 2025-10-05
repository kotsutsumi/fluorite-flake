/**
 * Turso CLI 認証関連ユーティリティ
 */
import { executeTursoCommand, throwOnError } from "./executor.js";
import type { AuthTokenInfo, CommandResult, UserInfo } from "./types.js";

/**
 * 現在のユーザー情報を取得
 */
export async function whoami(): Promise<UserInfo> {
    const result = await executeTursoCommand(["auth", "whoami"]);
    throwOnError(result, "turso auth whoami");

    // 出力からユーザー名を抽出（通常は "Logged in as: username" の形式）
    const match = result.stdout?.match(/Logged in as:\s*(.+)/);
    if (!match) {
        throw new Error("Unable to parse whoami output");
    }

    return {
        username: match[1].trim(),
    };
}

/**
 * 現在の認証トークンを取得
 */
export async function getToken(): Promise<AuthTokenInfo> {
    const result = await executeTursoCommand(["auth", "token"]);
    throwOnError(result, "turso auth token");

    return {
        token: result.stdout?.trim() || "",
    };
}

/**
 * ヘッドレスログイン（ブラウザを開かない認証）
 */
export async function loginHeadless(): Promise<CommandResult> {
    return await executeTursoCommand(["auth", "login", "--headless"]);
}

/**
 * 通常のログイン（ブラウザ認証）
 */
export async function login(): Promise<CommandResult> {
    return await executeTursoCommand(["auth", "login"]);
}

/**
 * ログアウト
 */
export async function logout(allSessions = false): Promise<CommandResult> {
    const args = ["auth", "logout"];
    if (allSessions) {
        args.push("--all");
    }
    return await executeTursoCommand(args);
}

/**
 * 新規サインアップ
 */
export async function signup(headless = false): Promise<CommandResult> {
    const args = ["auth", "signup"];
    if (headless) {
        args.push("--headless");
    }
    return await executeTursoCommand(args);
}

/**
 * API トークン一覧を取得
 */
export async function listApiTokens(): Promise<CommandResult> {
    return await executeTursoCommand(["auth", "api-tokens", "list"]);
}

/**
 * API トークンを作成
 */
export async function createApiToken(
    tokenName: string
): Promise<CommandResult> {
    return await executeTursoCommand(["auth", "api-tokens", "mint", tokenName]);
}

/**
 * API トークンを無効化
 */
export async function revokeApiToken(
    tokenName: string
): Promise<CommandResult> {
    return await executeTursoCommand([
        "auth",
        "api-tokens",
        "revoke",
        tokenName,
    ]);
}

/**
 * 認証状態を確認
 */
export async function isAuthenticated(): Promise<boolean> {
    try {
        await whoami();
        return true;
    } catch {
        return false;
    }
}

// EOF
