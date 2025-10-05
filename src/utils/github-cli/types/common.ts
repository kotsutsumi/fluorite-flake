/**
 * GitHub CLI ラッパーの共通型定義
 */

// コマンド実行結果のステータス
export type CommandStatus = "success" | "error" | "timeout";

// GitHub CLI コマンド定義
export type GitHubCLICommand = {
    command: string;
    args?: string[];
    flags?: Record<string, string | boolean | number>;
    input?: string;
    timeout?: number;
};

// コマンド実行レスポンス
export type GitHubCLIResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: GitHubCLIError;
    raw: string;
    exitCode: number;
    executionTime: number;
};

// GitHub CLI エラー情報
export type GitHubCLIError = {
    code: GitHubCLIErrorCode;
    message: string;
    originalError?: Error;
    command?: string;
    suggestion?: string;
};

// エラーコード定義
export const GitHubCLIErrorCode = {
    // 認証関連
    AUTH_FAILED: "AUTH_FAILED",
    AUTH_EXPIRED: "AUTH_EXPIRED",
    AUTH_MISSING: "AUTH_MISSING",

    // コマンド実行関連
    COMMAND_NOT_FOUND: "COMMAND_NOT_FOUND",
    INVALID_COMMAND: "INVALID_COMMAND",
    EXECUTION_FAILED: "EXECUTION_FAILED",
    TIMEOUT: "TIMEOUT",

    // API関連
    API_RATE_LIMIT: "API_RATE_LIMIT",
    API_UNAVAILABLE: "API_UNAVAILABLE",
    NETWORK_ERROR: "NETWORK_ERROR",

    // データ関連
    PARSE_ERROR: "PARSE_ERROR",
    VALIDATION_ERROR: "VALIDATION_ERROR",

    // システム関連
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type GitHubCLIErrorCode =
    (typeof GitHubCLIErrorCode)[keyof typeof GitHubCLIErrorCode];

// 認証ステータス
export type AuthStatus = {
    isAuthenticated: boolean;
    username?: string;
    scopes?: string[];
    tokenType?: "oauth" | "personal_access_token";
    expiresAt?: Date;
};

// 実行オプション
export type ExecutionOptions = {
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    suppressErrors?: boolean;
    cwd?: string;
    env?: Record<string, string>;
};

// EOF
